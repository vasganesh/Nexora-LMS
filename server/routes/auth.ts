import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { mapUserProfile } from '../lib/mappers.js';
import { signToken, requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  generateSecurePassword,
  sendCredentialsEmail,
  sendSubscriptionConfirmationEmail,
  sendOtpEmail,
  sendStudentApprovalEmail,
  sendStudentRejectionEmail,
  sendAdminRegistrationAlert,
} from '../lib/emailService.js';
import { registrationStore } from '../lib/registrationStore.js';

const router = Router();

// In-memory store for OTPs (email -> { otp, expiresAt })
const passwordResetStore = new Map<string, { otp: string; expiresAt: number }>();

// Dev-only helper: return OTP for testing (only available when not in production)
router.get('/debug/otp', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  const { email } = req.query as { email?: string };
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const record = passwordResetStore.get(email.toLowerCase());
  if (!record) return res.status(404).json({ error: 'No OTP for this email' });
  return res.json({ email: email.toLowerCase(), otp: record.otp, expiresAt: record.expiresAt });
});

async function loadUser(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      studentProfile: {
        include: {
          analytics: true,
          learningStreak: true,
        },
      },
      teacherProfile: true,
      adminProfile: true,
    },
  });
}

// Check if email already exists
router.get('/check-email', async (req, res) => {
  const { email } = req.query as { email?: string };
  if (!email) {
    return res.status(400).json({ error: 'Email parameter is required' });
  }
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  return res.json({ exists: !!existing });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    console.warn(`[server] Login failed: Missing email or password in request body`);
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const rawInput = email.toLowerCase().trim();

  // Check if input matches an assigned unique username in registrationStore
  let resolvedEmail = rawInput;
  const allRequests = registrationStore.getAll();
  const matchedByUsername = allRequests.find(r => r.username?.toLowerCase() === rawInput);
  if (matchedByUsername) {
    resolvedEmail = matchedByUsername.email.toLowerCase();
  }

  // Verify registration status
  const regReq = registrationStore.getByEmail(resolvedEmail);
  if (regReq) {
    if (regReq.status === 'REMOVED') {
      return res.status(403).json({
        error: `Your student account has been removed by the administrator and your credentials have been disabled. ${regReq.rejectReason ? `Reason: ${regReq.rejectReason}` : 'Please contact the school administration.'}`,
        status: 'REMOVED'
      });
    }
    if (regReq.status === 'PENDING') {
      return res.status(403).json({
        error: 'Your registration is currently pending administrator approval. You will receive an email with your unique login credentials once verified.',
        status: 'PENDING'
      });
    }
    if (regReq.status === 'REJECTED') {
      return res.status(403).json({
        error: `Your registration request was not approved by the administrator. ${regReq.rejectReason ? `Reason: ${regReq.rejectReason}` : 'Please contact support or re-apply.'}`,
        status: 'REJECTED'
      });
    }
  }

  const user = await loadUser(resolvedEmail);
  if (!user) {
    console.warn(`[server] Login failed: User not found in database for email="${email}"`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    console.warn(`[server] Login failed: Password mismatch for email="${email}"`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({ userId: user.id, role: user.role });
  const profile = mapUserProfile({
    ...user,
    studentProfile: user.studentProfile,
  });

  return res.json({
    token,
    user: profile,
    role: user.role.toLowerCase(),
  });
});

router.post('/signup', async (req, res) => {
  const { email, password, firstName, lastName, role, boardId, classId } = req.body as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    boardId?: string;
    classId?: string;
  };

  if (!email || !firstName || !lastName || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Generate a secure random password
    const generatedPassword = generateSecurePassword();
    const passwordHash = await bcrypt.hash(generatedPassword, 10);
    const userRole = role.toUpperCase() as 'STUDENT' | 'TEACHER' | 'ADMIN';

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role: userRole,
        ...(userRole === 'STUDENT' && boardId && classId
          ? {
              studentProfile: {
                create: {
                  boardId,
                  classId,
                  analytics: { create: { xp: 100 } },
                  learningStreak: { create: { currentStreak: 1, longestStreak: 1 } },
                },
              },
            }
          : {}),
        ...(userRole === 'TEACHER'
          ? {
              teacherProfile: {
                create: {
                  bio: 'Nexora Learning instructor',
                  qualification: 'Subject expert',
                },
              },
            }
          : {}),
        ...(userRole === 'ADMIN'
          ? {
              adminProfile: {
                create: { dept: 'Operations' },
              },
            }
          : {}),
      },
      include: {
        studentProfile: {
          include: {
            analytics: true,
            learningStreak: true,
          },
        },
      },
    });

    // Send credentials email but DO NOT show password in response
    await sendCredentialsEmail(email.toLowerCase(), firstName, lastName, generatedPassword, userRole);

    // Return only success message, NO password in response
    return res.status(201).json({
      success: true,
      message: 'Account created successfully. Check your email for credentials.',
      email: email.toLowerCase(),
      role: userRole.toLowerCase(),
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create account' });
  }
});

/**
 * Subscription confirmation endpoint
 * Called when user clicks "Subscribe" button on subscription page
 * Sends credentials email and redirects to login
 */
router.post('/subscribe', async (req, res) => {
  const { email, subscriptionPlan } = req.body as {
    email?: string;
    subscriptionPlan?: string;
  };

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only generate a new password if the user does not have a password hash yet
    let generatedPassword = "";
    if (!user.passwordHash || user.passwordHash.length < 10) {
      generatedPassword = generateSecurePassword();
      const passwordHash = await bcrypt.hash(generatedPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    } else {
      generatedPassword = "Use the temporary password sent in your registration email.";
    }

    const emailSent = await sendSubscriptionConfirmationEmail(
      email.toLowerCase(),
      user.firstName,
      user.lastName,
      generatedPassword,
      user.role,
      subscriptionPlan || 'Full Academic Access Pass'
    );

    if (emailSent) {
      return res.json({
        success: true,
        message: 'Subscription confirmed. Credentials sent to email.',
        redirectTo: '/#/login',
      });
    } else {
      return res.status(500).json({ error: 'Failed to send confirmation email' });
    }
  } catch (error: any) {
    console.error('Subscription error:', error);
    return res.status(500).json({ error: error.message || 'Subscription failed' });
  }
});

// User Management CRUD for Admin Configurable Users
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        studentProfile: {
          include: {
            class: true,
            board: true,
          }
        },
        teacherProfile: true,
        adminProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(users);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  const { email, password, firstName, lastName, role, boardId, classId, dept, bio, qualification } = req.body;
  
  if (!email || !password || !firstName || !lastName || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role.toUpperCase() as 'STUDENT' | 'TEACHER' | 'ADMIN';

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role: userRole,
        ...(userRole === 'STUDENT' && boardId && classId
          ? {
              studentProfile: {
                create: {
                  boardId,
                  classId,
                  analytics: { create: { xp: 100 } },
                  learningStreak: { create: { currentStreak: 1, longestStreak: 1 } },
                },
              },
            }
          : {}),
        ...(userRole === 'TEACHER'
          ? {
              teacherProfile: {
                create: {
                  bio: bio || 'EduVerse instructor',
                  qualification: qualification || 'Subject expert',
                },
              },
            }
          : {}),
        ...(userRole === 'ADMIN'
          ? {
              adminProfile: {
                create: { dept: dept || 'Operations' },
              },
            }
          : {}),
      },
    });

    return res.status(201).json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { email, password, firstName, lastName, role, boardId, classId, dept, bio, qualification } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const data: any = {};
    if (email) data.email = email.toLowerCase();
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (role) data.role = role.toUpperCase();
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const userRole = (role || user.role).toUpperCase();
    
    if (userRole === 'STUDENT') {
      data.studentProfile = {
        upsert: {
          create: {
            boardId: boardId || '',
            classId: classId || '',
          },
          update: {
            boardId: boardId,
            classId: classId,
          }
        }
      };
    } else if (userRole === 'TEACHER') {
      data.teacherProfile = {
        upsert: {
          create: {
            bio: bio || '',
            qualification: qualification || '',
          },
          update: {
            bio,
            qualification,
          }
        }
      };
    } else if (userRole === 'ADMIN') {
      data.adminProfile = {
        upsert: {
          create: {
            dept: dept || 'Operations',
          },
          update: {
            dept,
          }
        }
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });

    return res.json(updatedUser);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/logout', (_req, res) => {
  res.json({ success: true });
});

// Forgot password: send OTP
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    passwordResetStore.set(email.toLowerCase(), { otp, expiresAt });

    const sent = await sendOtpEmail(email.toLowerCase(), otp);
    if (!sent) return res.status(500).json({ error: 'Failed to send OTP' });

    return res.json({ success: true, message: 'OTP sent to email' });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: err.message || 'Failed to process request' });
  }
});

// Reset password: verify OTP and set new password
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body as { email?: string; otp?: string; newPassword?: string };
  if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const record = passwordResetStore.get(email.toLowerCase());
    if (!record) return res.status(400).json({ error: 'No OTP requested for this email' });
    if (record.expiresAt < Date.now()) {
      passwordResetStore.delete(email.toLowerCase());
      return res.status(400).json({ error: 'OTP expired' });
    }
    if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    passwordResetStore.delete(email.toLowerCase());
    return res.json({ success: true, message: 'Password reset successful' });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: err.message || 'Failed to reset password' });
  }
});

// ============================================================================
// STUDENT REGISTRATION & ADMIN APPROVAL PIPELINE
// ============================================================================

// Submit Student Registration Request (Awaiting Admin Approval)
router.post('/registration-request', async (req, res) => {
  const {
    email,
    name,
    firstName,
    lastName,
    age,
    location,
    boardId,
    classId,
    boardTitle,
    classTitle,
    optedSubjectId,
  } = req.body as {
    email?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    age?: string;
    location?: string;
    boardId?: string;
    classId?: string;
    boardTitle?: string;
    classTitle?: string;
    optedSubjectId?: string;
  };

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Gmail address is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check if user is already an approved registered user in the database
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const existingRequest = registrationStore.getByEmail(normalizedEmail);
    if (existingUser && (!existingRequest || existingRequest.status === 'APPROVED')) {
      return res.status(409).json({ error: 'This email is already registered and approved. Please sign in.' });
    }

    const finalName = (name || `${firstName || ''} ${lastName || ''}`).trim() || 'Scholar';
    const nameParts = finalName.split(/\s+/);
    const finalFirstName = firstName || nameParts[0] || 'Scholar';
    const finalLastName = lastName || nameParts.slice(1).join(' ') || 'Student';

    const regRequest = registrationStore.create({
      name: finalName,
      firstName: finalFirstName,
      lastName: finalLastName,
      email: normalizedEmail,
      age: age ? String(age) : '',
      location: location || '',
      boardId: boardId || '',
      boardTitle: boardTitle || 'Academic Board',
      classId: classId || '',
      classTitle: classTitle || 'Class',
      optedSubjectId: optedSubjectId || '',
    });

    // Notify administrator in background via email
    sendAdminRegistrationAlert(
      finalName,
      normalizedEmail,
      boardTitle || 'Academic Board',
      classTitle || 'Class',
      age ? String(age) : '',
      location || ''
    ).catch((err) => console.warn('Admin email alert notice:', err));

    // Also register an in-app system notification for Admin
    try {
      const adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      if (adminUsers.length > 0) {
        const notification = await prisma.notification.create({
          data: {
            title: `New Student Registration: ${finalName}`,
            body: `${finalName} (${normalizedEmail}) registered for ${classTitle || 'Class'}. Awaiting your approval.`,
            type: 'SYSTEM',
          },
        });

        for (const admin of adminUsers) {
          await prisma.userNotification.create({
            data: {
              userId: admin.id,
              notificationId: notification.id,
              isRead: false,
            },
          }).catch(() => {});
        }
      }
    } catch (notifErr) {
      console.warn('Failed to insert admin in-app notification:', notifErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Your registration has been submitted and is awaiting administrator approval. You will receive an email once approved.',
      request: regRequest,
    });
  } catch (error: any) {
    console.error('Registration request error:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit registration request' });
  }
});

// Get all Registration Requests (for Admin portal)
router.get('/registration-requests', async (_req, res) => {
  try {
    // Automatically synchronize all registered database students so all registered students till now are displayed for admin
    try {
      const dbStudents = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        include: {
          studentProfile: {
            include: {
              board: true,
              class: true,
            },
          },
        },
      });
      registrationStore.syncExistingUsers(dbStudents);
    } catch (syncErr) {
      console.warn('Could not sync DB students to registration store:', syncErr);
    }

    const requests = registrationStore.getAll();
    const pendingCount = registrationStore.getPendingCount();
    return res.json({
      requests,
      pendingCount,
      totalCount: requests.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch registration requests' });
  }
});

// Check Registration Status by student email
router.get('/registration-status', async (req, res) => {
  const { email } = req.query as { email?: string };
  if (!email) return res.status(400).json({ error: 'Email parameter is required' });

  const record = registrationStore.getByEmail(email);
  if (!record) {
    return res.json({ status: 'NOT_FOUND' });
  }

  return res.json({
    status: record.status,
    request: record,
  });
});

// Admin Approve Registration Request
router.post('/registration-request/:id/approve', async (req, res) => {
  const { id } = req.params;
  const targetRequest = registrationStore.getById(id);

  if (!targetRequest) {
    return res.status(404).json({ error: 'Registration request not found' });
  }

  try {
    // Generate unique username: first.last_xxxx
    const cleanFirstName = targetRequest.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanLastName = targetRequest.lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const uniqueUsername = `${cleanFirstName || 'scholar'}.${cleanLastName || 'student'}_${randSuffix}`;

    // Generate unique secure password
    const generatedPassword = generateSecurePassword();
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    // Resolve Board & Class UUIDs in PostgreSQL DB
    let targetBoardId = targetRequest.boardId;
    let targetClassId = targetRequest.classId;

    try {
      const existingBoard = await prisma.board.findFirst({
        where: {
          OR: [
            { id: targetRequest.boardId.includes('-') && targetRequest.boardId.length === 36 ? targetRequest.boardId : undefined },
            { code: { contains: targetRequest.boardId, mode: 'insensitive' } },
            { name: { contains: targetRequest.boardTitle || '', mode: 'insensitive' } }
          ].filter(Boolean) as any
        },
        include: { classes: true }
      });

      if (existingBoard) {
        targetBoardId = existingBoard.id;
        const matchedClass = existingBoard.classes.find(c =>
          c.id === targetRequest.classId ||
          c.name.toLowerCase().includes(targetRequest.classTitle?.toLowerCase() || '')
        );
        targetClassId = matchedClass ? matchedClass.id : (existingBoard.classes[0]?.id || targetRequest.classId);
      } else {
        const anyBoard = await prisma.board.findFirst({ include: { classes: true } });
        if (anyBoard) {
          targetBoardId = anyBoard.id;
          targetClassId = anyBoard.classes[0]?.id || targetRequest.classId;
        }
      }
    } catch (uuidLookupErr) {
      console.warn('Board lookup notice:', uuidLookupErr);
    }

    // Upsert User in Database with STUDENT role
    const existingUser = await prisma.user.findUnique({
      where: { email: targetRequest.email.toLowerCase() },
    });

    let dbUser;
    if (existingUser) {
      dbUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          role: 'STUDENT',
          firstName: targetRequest.firstName,
          lastName: targetRequest.lastName,
        },
      });
    } else {
      dbUser = await prisma.user.create({
        data: {
          email: targetRequest.email.toLowerCase(),
          passwordHash,
          firstName: targetRequest.firstName,
          lastName: targetRequest.lastName,
          role: 'STUDENT',
          ...(targetBoardId && targetClassId
            ? {
                studentProfile: {
                  create: {
                    boardId: targetBoardId,
                    classId: targetClassId,
                    analytics: { create: { xp: 100 } },
                    learningStreak: { create: { currentStreak: 1, longestStreak: 1 } },
                  },
                },
              }
            : {}),
        },
      });
    }

    // Update registration request in persistent store
    const approvedRequest = registrationStore.approve(id, uniqueUsername, generatedPassword);

    // Send Acceptance email to student's Gmail with unique credentials
    await sendStudentApprovalEmail(
      targetRequest.email.toLowerCase(),
      targetRequest.firstName,
      targetRequest.lastName,
      uniqueUsername,
      generatedPassword,
      targetRequest.boardTitle,
      targetRequest.classTitle
    );

    return res.json({
      success: true,
      message: `Registration accepted. Unique credentials sent to ${targetRequest.email}.`,
      request: approvedRequest,
      credentials: {
        email: targetRequest.email.toLowerCase(),
        username: uniqueUsername,
        password: generatedPassword,
      },
    });
  } catch (err: any) {
    console.error('Approval error:', err);
    return res.status(500).json({ error: err.message || 'Failed to approve registration request' });
  }
});

// Admin Reject Registration Request
router.post('/registration-request/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };
  const targetRequest = registrationStore.getById(id);

  if (!targetRequest) {
    return res.status(404).json({ error: 'Registration request not found' });
  }

  try {
    const rejectedRequest = registrationStore.reject(
      id,
      reason || 'Academic eligibility criteria could not be verified.'
    );

    // Send Rejection email to student's Gmail
    await sendStudentRejectionEmail(
      targetRequest.email.toLowerCase(),
      targetRequest.firstName,
      targetRequest.lastName,
      reason || 'Academic eligibility criteria could not be verified.'
    );

    return res.json({
      success: true,
      message: `Registration rejected. Status update email sent to ${targetRequest.email}.`,
      request: rejectedRequest,
    });
  } catch (err: any) {
    console.error('Rejection error:', err);
    return res.status(500).json({ error: err.message || 'Failed to reject registration request' });
  }
});

// Admin Remove Student & Disable Credentials
router.post('/registration-request/:id/remove', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };
  const targetRequest = registrationStore.getById(id);

  if (!targetRequest) {
    return res.status(404).json({ error: 'Student registration record not found' });
  }

  try {
    const removalReason = reason || 'Student account removed and credentials disabled by administrator.';

    // 1. Update registration store status to REMOVED
    const removedRequest = registrationStore.remove(id, removalReason);

    // 2. Disable credentials in DB if user exists by revoking passwordHash
    const normalizedEmail = targetRequest.email.toLowerCase().trim();
    const dbUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (dbUser) {
      const revokedHash = `REVOKED_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          passwordHash: revokedHash,
        },
      });
      console.log(`[server] Disabled credentials for student ${normalizedEmail}`);
    }

    return res.json({
      success: true,
      message: `Student account for ${targetRequest.name || targetRequest.email} removed and credentials disabled successfully.`,
      request: removedRequest,
    });
  } catch (err: any) {
    console.error('Remove student error:', err);
    return res.status(500).json({ error: err.message || 'Failed to remove student and disable credentials' });
  }
});

export default router;

