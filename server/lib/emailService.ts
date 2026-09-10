import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

/**
 * Initialize email transporter with Gmail SMTP configuration from environment variables
 * Falls back to console simulation if SMTP credentials are not yet configured
 */
function getTransporter(): Transporter | { sendMail: (opts: any) => Promise<any> } {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    // Graceful fallback for local development / testing without live credentials
    return {
      sendMail: async (mailOptions: any) => {
        console.log(`\n================== 📧 EMAIL DISPATCH SIMULATOR ==================`);
        console.log(`To:      ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`From:    ${mailOptions.from}`);
        console.log(`Time:    ${new Date().toISOString()}`);
        console.log(`Content:\n${mailOptions.text || '(HTML Email Content)'}`);
        console.log(`=================================================================\n`);
        return { messageId: `mock-${Date.now()}` };
      },
    } as any;
  }

  if (!transporter) {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587');

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return transporter;
}

/**
 * Generate a secure random password (12 characters)
 */
export function generateSecurePassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';

  const allChars = uppercase + lowercase + numbers + special;
  let password = '';

  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Send account credentials email to user
 */
export async function sendCredentialsEmail(
  email: string,
  firstName: string,
  lastName: string,
  generatedPassword: string,
  role: string
): Promise<boolean> {
  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Nexora Learning <nexoralmslearning@gmail.com>',
      to: email,
      subject: '🎓 Your Nexora Learning Account Credentials',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
          <!-- White card container -->
          <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #667eea; padding-bottom: 20px;">
              <h2 style="color: #667eea; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
                🎓 Nexora Learning
              </h2>
              <p style="color: #666; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                Your Academic Journey Starts Here
              </p>
            </div>

            <!-- Greeting -->
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Welcome, <strong>${firstName} ${lastName}!</strong>
            </p>

            <!-- Success message -->
            <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
              <p style="color: #2e7d32; margin: 0; font-size: 14px; font-weight: 600;">
                ✅ Your account has been successfully created!
              </p>
            </div>

            <!-- Credentials section -->
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
              <p style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0; font-weight: 600;">
                Your Login Credentials:
              </p>
              
              <div style="background-color: #ffffff; border: 1px solid #ddd; padding: 12px; margin-bottom: 10px; border-radius: 4px; font-family: monospace;">
                <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">
                  <strong>Email:</strong>
                </p>
                <p style="margin: 0 0 10px 0; color: #333; font-size: 14px; font-weight: bold; word-break: break-all;">
                  ${email}
                </p>
                <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">
                  <strong>Temporary Password:</strong>
                </p>
                <p style="margin: 0; color: #333; font-size: 14px; font-weight: bold; letter-spacing: 1px;">
                  ${generatedPassword}
                </p>
              </div>

              <p style="color: #ff9800; font-size: 12px; margin: 0; font-style: italic;">
                ⚠️ Save these credentials safely. This is your temporary password.
              </p>
            </div>

            <!-- Account Info -->
            <div style="background-color: #f0f7ff; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
              <p style="color: #1976d2; margin: 0; font-size: 12px; font-weight: 600;">
                <strong>Account Role:</strong> ${role}
              </p>
            </div>

            <!-- Next steps -->
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; font-size: 14px; font-weight: 700; margin: 0 0 10px 0;">
                📋 Next Steps:
              </h3>
              <ol style="color: #555; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Open the Nexora Learning portal</li>
                <li>Click on "Sign In"</li>
                <li>Enter your email and the temporary password above</li>
                <li>Complete your profile setup</li>
                <li>Start your learning journey!</li>
              </ol>
            </div>

            <!-- Security notice -->
            <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 12px; border-radius: 4px; margin-bottom: 25px;">
              <p style="color: #e65100; margin: 0; font-size: 12px; font-weight: 600;">
                🔒 Security Reminder: Never share your password with anyone. Our support team will never ask for your password.
              </p>
            </div>

            <!-- Support -->
            <p style="color: #777; font-size: 12px; text-align: center; margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #eee;">
              Need help? Contact our support team at 
              <a href="mailto:support@nexoralearning.com" style="color: #667eea; text-decoration: none; font-weight: 600;">
                support@nexoralearning.com
              </a>
            </p>

            <!-- Footer -->
            <p style="color: #999; font-size: 11px; text-align: center; margin: 10px 0 0 0; font-style: italic;">
              This is an automated message from Nexora Learning. Please do not reply to this email.
            </p>

          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Credentials email sent successfully to ${email}. Temp Password: ${generatedPassword}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send credentials email:', error);
    return false;
  }
}

/**
 * Send subscription confirmation email with credentials
 */
export async function sendSubscriptionConfirmationEmail(
  email: string,
  firstName: string,
  lastName: string,
  generatedPassword: string,
  role: string,
  subscriptionPlan: string = 'Full Academic Access Pass'
): Promise<boolean> {
  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Nexora Learning <nexoralmslearning@gmail.com>',
      to: email,
      subject: '✅ Subscription Confirmed - Your Nexora Learning Credentials Inside',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
          <!-- White card container -->
          <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            
            <!-- Success Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="font-size: 40px; margin-bottom: 10px;">✅</div>
              <h2 style="color: #4caf50; margin: 0; font-size: 26px; font-weight: 800;">
                Subscription Activated!
              </h2>
              <p style="color: #666; margin: 5px 0 0 0; font-size: 13px;">
                Welcome to Nexora Learning
              </p>
            </div>

            <!-- Greeting -->
            <p style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
              Dear <strong>${firstName} ${lastName}</strong>,
            </p>

            <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
              Your subscription to <strong>${subscriptionPlan}</strong> has been successfully activated! 🎉
            </p>

            <!-- Subscription Details -->
            <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); padding: 20px; border-radius: 6px; margin-bottom: 25px; border: 1px solid #667eea40;">
              <p style="color: #667eea; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0; font-weight: 700;">
                Subscription Details:
              </p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 13px; border-bottom: 1px solid #667eea30;">Plan:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 13px; font-weight: 600; text-align: right; border-bottom: 1px solid #667eea30;">${subscriptionPlan}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 13px; border-bottom: 1px solid #667eea30;">Status:</td>
                  <td style="padding: 8px 0; color: #4caf50; font-size: 13px; font-weight: 600; text-align: right; border-bottom: 1px solid #667eea30;">✅ ACTIVE</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 13px;">Role:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 13px; font-weight: 600; text-align: right;">${role}</td>
                </tr>
              </table>
            </div>

            <!-- Login Credentials -->
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin-bottom: 25px; border: 2px dashed #667eea;">
              <p style="color: #667eea; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0; font-weight: 700;">
                📧 Your Portal Login Credentials:
              </p>
              
              <div style="background-color: #ffffff; border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 4px; font-family: 'Courier New', monospace;">
                <p style="margin: 0 0 8px 0; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">
                  Email Address:
                </p>
                <p style="margin: 0 0 12px 0; color: #333; font-size: 14px; font-weight: bold; word-break: break-all; background-color: #f9f9f9; padding: 8px; border-radius: 3px;">
                  ${email}
                </p>
                <p style="margin: 0 0 8px 0; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">
                  Temporary Password:
                </p>
                <p style="margin: 0; color: #333; font-size: 14px; font-weight: bold; letter-spacing: 2px; background-color: #f9f9f9; padding: 8px; border-radius: 3px;">
                  ${generatedPassword}
                </p>
              </div>

              <p style="color: #ff6f00; font-size: 11px; margin: 10px 0 0 0; font-weight: 600;">
                ⚠️ Save these credentials in a safe place. You'll need them to log in.
              </p>
            </div>

            <!-- Features Unlocked -->
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; font-size: 13px; font-weight: 700; margin: 0 0 12px 0;">
                🚀 Features Now Unlocked:
              </h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div style="background-color: #f0f7ff; padding: 10px; border-radius: 4px; border-left: 3px solid #2196f3;">
                  <p style="color: #1565c0; font-size: 12px; font-weight: 600; margin: 0;">📚 All Subjects</p>
                </div>
                <div style="background-color: #f0f7ff; padding: 10px; border-radius: 4px; border-left: 3px solid #2196f3;">
                  <p style="color: #1565c0; font-size: 12px; font-weight: 600; margin: 0;">🎥 Live Classes</p>
                </div>
                <div style="background-color: #f0f7ff; padding: 10px; border-radius: 4px; border-left: 3px solid #2196f3;">
                  <p style="color: #1565c0; font-size: 12px; font-weight: 600; margin: 0;">🤖 AI Tutor Support</p>
                </div>
                <div style="background-color: #f0f7ff; padding: 10px; border-radius: 4px; border-left: 3px solid #2196f3;">
                  <p style="color: #1565c0; font-size: 12px; font-weight: 600; margin: 0;">📊 Analytics</p>
                </div>
              </div>
            </div>

            <!-- Call to Action -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 6px; text-align: center; margin-bottom: 25px;">
              <p style="color: #ffffff; font-size: 13px; margin: 0 0 12px 0; line-height: 1.5;">
                Ready to start learning? Log in to your account now to begin!
              </p>
              <a href="http://localhost:5173/#/login" style="display: inline-block; background-color: #ffffff; color: #667eea; padding: 10px 24px; text-decoration: none; font-weight: 700; border-radius: 4px; font-size: 12px;">
                Go to Portal
              </a>
            </div>

            <!-- Support -->
            <p style="color: #777; font-size: 12px; text-align: center; margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #eee;">
              Questions? Contact our support team at 
              <a href="mailto:support@nexoralearning.com" style="color: #667eea; text-decoration: none; font-weight: 600;">
                support@nexoralearning.com
              </a>
            </p>

            <!-- Footer -->
            <p style="color: #999; font-size: 11px; text-align: center; margin: 10px 0 0 0; font-style: italic;">
              This is an automated message. Please do not reply to this email.
            </p>

          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Subscription confirmation email sent to ${email}. Temp Password: ${generatedPassword}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send subscription confirmation email:', error);
    return false;
  }
}

/**
 * Send OTP email for password reset
 */
export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  try {
    const transporter = getTransporter();
    const mailOptions = {
      from: process.env.SMTP_FROM || 'Nexora Learning <nexoralmslearning@gmail.com>',
      to: email,
      subject: '🔒 Password Reset OTP - Nexora Learning',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:#fff;border-radius:8px;padding:20px;">
            <h2 style="color:#333;margin:0 0 8px 0">Password Reset Request</h2>
            <p style="color:#555;margin:0 0 12px 0">Use the one-time code below to reset your Nexora Learning password. This code expires in 10 minutes.</p>
            <div style="font-family:monospace;background:#f6f8fa;padding:12px;border-radius:6px;text-align:center;font-size:20px;font-weight:700;letter-spacing:2px;">${otp}</div>
            <p style="color:#999;font-size:12px;margin-top:12px">If you did not request this, ignore this email.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
    return true;
  } catch (err) {
    console.error('❌ Failed to send OTP email:', err);
    return false;
  }
}

/**
 * Send acceptance email to student with unique generated credentials
 */
export async function sendStudentApprovalEmail(
  email: string,
  firstName: string,
  lastName: string,
  username: string,
  generatedPassword: string,
  boardTitle: string = 'Academic Board',
  classTitle: string = 'Registered Class'
): Promise<boolean> {
  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Nexora Learning <nexoralmslearning@gmail.com>',
      to: email,
      subject: '🎉 Registration Accepted! Your Nexora Learning Unique Login Credentials',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px;">
          <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 12px 36px rgba(0,0,0,0.15);">
            
            <!-- Header with logo -->
            <div style="text-align: center; margin-bottom: 28px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px;">
              <div style="font-size: 38px; margin-bottom: 6px;">🎓</div>
              <h1 style="color: #1e1b4b; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                Nexora Learning
              </h1>
              <p style="color: #64748b; margin: 6px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">
                Academic Access Approval Notice
              </p>
            </div>

            <!-- Approval Banner -->
            <div style="background-color: #ecfdf5; border-left: 5px solid #10b981; padding: 16px; margin-bottom: 24px; border-radius: 6px;">
              <h3 style="color: #065f46; margin: 0 0 4px 0; font-size: 15px; font-weight: 700;">
                ✅ Registration Approved by Administrator
              </h3>
              <p style="color: #047857; margin: 0; font-size: 13px;">
                Dear <strong>${firstName} ${lastName}</strong>, your application has been officially verified and accepted.
              </p>
            </div>

            <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
              Welcome to the Nexora Learning community! Your dedicated academic profile is now fully active for <strong>${classTitle} (${boardTitle})</strong>.
            </p>

            <!-- Unique Credentials Card -->
            <div style="background: #f8fafc; border: 2px solid #6366f1; border-radius: 8px; padding: 22px; margin-bottom: 24px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #4f46e5; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 800;">
                  🔐 Your Unique Login Credentials
                </span>
                <span style="background: #e0e7ff; color: #4338ca; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">
                  UNIQUE ID
                </span>
              </div>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; font-family: monospace;">
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 40%; border-bottom: 1px dashed #cbd5e1;">Username:</td>
                  <td style="padding: 10px 0; color: #0f172a; font-weight: 700; border-bottom: 1px dashed #cbd5e1; word-break: break-all;">
                    ${username}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600; border-bottom: 1px dashed #cbd5e1;">Email ID:</td>
                  <td style="padding: 10px 0; color: #0f172a; font-weight: 700; border-bottom: 1px dashed #cbd5e1; word-break: break-all;">
                    ${email}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Unique Password:</td>
                  <td style="padding: 10px 0; color: #dc2626; font-weight: 800; font-size: 15px; letter-spacing: 1.5px;">
                    ${generatedPassword}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Login CTA button -->
            <div style="text-align: center; margin: 28px 0;">
              <a href="http://localhost:5173/#/login" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                Log In to Scholar Workspace &rarr;
              </a>
            </div>

            <!-- Quick Instructions -->
            <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
              <h4 style="color: #334155; font-size: 12px; font-weight: 700; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                📌 How to Sign In:
              </h4>
              <ol style="color: #475569; font-size: 12px; line-height: 1.8; margin: 0; padding-left: 18px;">
                <li>Click the login button above or navigate to the Nexora portal sign-in page.</li>
                <li>Select the <strong>Student</strong> tab.</li>
                <li>Enter your registered Email (<strong>${email}</strong>) or Username (<strong>${username}</strong>).</li>
                <li>Enter your unique generated password displayed above.</li>
              </ol>
            </div>

            <!-- Security Notice -->
            <p style="color: #b45309; background-color: #fef3c7; border: 1px solid #fde68a; padding: 10px 14px; border-radius: 6px; font-size: 11px; margin: 0 0 20px 0; line-height: 1.5;">
              ⚠️ <strong>Important:</strong> Please store your credentials securely. Do not share your unique password with anyone.
            </p>

            <!-- Support -->
            <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 18px;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                Nexora Learning System &bull; For queries contact support at 
                <a href="mailto:support@nexoralearning.com" style="color: #6366f1; text-decoration: none;">support@nexoralearning.com</a>
              </p>
            </div>

          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Student Approval Email sent successfully to ${email}. Username: ${username}, Password: ${generatedPassword}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send student approval email:', error);
    return false;
  }
}

/**
 * Send rejection notification email to student
 */
export async function sendStudentRejectionEmail(
  email: string,
  firstName: string,
  lastName: string,
  reason: string = 'Eligibility verification criteria could not be met.'
): Promise<boolean> {
  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Nexora Learning <nexoralmslearning@gmail.com>',
      to: email,
      subject: 'Update Regarding Your Nexora Learning Registration Request',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
          <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
            
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 18px;">
              <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 800;">
                Nexora Learning
              </h2>
              <p style="color: #64748b; margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                Admissions & Registration Review
              </p>
            </div>

            <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 18px;">
              Dear <strong>${firstName} ${lastName}</strong>,
            </p>

            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 22px; border-radius: 4px;">
              <h3 style="color: #991b1b; margin: 0 0 6px 0; font-size: 14px; font-weight: 700;">
                Registration Application Update
              </h3>
              <p style="color: #b91c1c; margin: 0; font-size: 13px; line-height: 1.5;">
                Thank you for your interest in Nexora Learning. After administrative review, we regret to inform you that your registration application could not be approved at this time.
              </p>
            </div>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; margin-bottom: 22px;">
              <span style="color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; display: block; margin-bottom: 6px;">
                Reason / Administrative Note:
              </span>
              <p style="color: #1e293b; margin: 0; font-size: 13px; font-weight: 600;">
                "${reason}"
              </p>
            </div>

            <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
              If you believe this was in error, or wish to submit updated documentation or re-register with corrected academic details, you are welcome to submit a new application or contact our academic helpdesk.
            </p>

            <div style="text-align: center; margin: 24px 0;">
              <a href="http://localhost:5173/#/signup" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 11px 24px; border-radius: 6px; font-weight: 600; font-size: 13px;">
                Review Registration Page
              </a>
            </div>

            <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; color: #94a3b8; font-size: 11px;">
              Questions? Reach out to <a href="mailto:support@nexoralearning.com" style="color: #4f46e5; text-decoration: none;">support@nexoralearning.com</a>
            </div>

          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Student Rejection Email sent to ${email}. Reason: ${reason}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send student rejection email:', error);
    return false;
  }
}

/**
 * Send email notification to Admin when a new student registers
 */
export async function sendAdminRegistrationAlert(
  studentName: string,
  studentEmail: string,
  boardTitle: string = 'Academic Board',
  classTitle: string = 'Class',
  age: string = '',
  location: string = ''
): Promise<boolean> {
  try {
    const transporter = getTransporter();
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@nexoralearning.com';

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Nexora Learning System <nexoralmslearning@gmail.com>',
      to: adminEmail,
      subject: `🔔 New Student Registration Pending Approval: ${studentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e2e8f0;">
            <h3 style="color: #1e293b; margin-top: 0;">New Student Registration Awaiting Review</h3>
            <p style="color: #475569; font-size: 13px;">A new scholar has submitted registration details and is waiting for your approval:</p>
            <ul style="color: #334155; font-size: 13px; line-height: 1.8;">
              <li><strong>Student Name:</strong> ${studentName}</li>
              <li><strong>Gmail Address:</strong> ${studentEmail}</li>
              <li><strong>Class & Board:</strong> ${classTitle} (${boardTitle})</li>
              ${age ? `<li><strong>Age:</strong> ${age}</li>` : ''}
              ${location ? `<li><strong>State/Location:</strong> ${location}</li>` : ''}
              <li><strong>Submission Time:</strong> ${new Date().toLocaleString('en-IN')}</li>
            </ul>
            <p style="color: #64748b; font-size: 12px; margin-top: 16px;">
              Please log in to your Admin Portal and check the <strong>Registration Requests</strong> menu to Accept or Reject this request.
            </p>
            <div style="text-align: center; margin-top: 20px;">
              <a href="http://localhost:5173/#/login" style="background: #4f46e5; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-size: 12px; font-weight: bold;">
                Open Admin Portal
              </a>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Admin notification alert sent for student ${studentName} (${studentEmail})`);
    return true;
  } catch (error) {
    console.warn('⚠️ Could not send admin alert email (non-critical):', error);
    return false;
  }
}

