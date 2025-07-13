import { hashPassword, comparePassword } from "./../utils/password";
import prisma from "../db/db";
import { Request, Response } from "express";
import {
  globalErrorHandler,
  BaseError,
  ErrorFactory,
} from "../utils/errorHandler";
import { apiResponse } from "../utils/responseHandler";
import {
  RegisterSchema,
  LoginSchema,
} from "../utils/validators/auth.validator";
import jwt from "jsonwebtoken";
import { sendEmail } from "../config/nodemailer.config";

const isPrismaUniqueConstraintError = (error: any): boolean =>
  error?.code === "P2002" && error?.meta?.target?.includes("email");

export const RegisterUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const validation = RegisterSchema.safeParse(req.body);
    if (!validation.success) {
      throw ErrorFactory.validation(validation.error);
    }

    const parsedData = validation.data;

    const hashedPassword = await hashPassword(parsedData.password);
    let user;
    try {
      user = await prisma.user.create({
        data: {
          name: parsedData.name,
          email: parsedData.email,
          password: hashedPassword,
        },
      });
    } catch (err) {
      if (isPrismaUniqueConstraintError(err)) {
        throw ErrorFactory.conflict("Email already in use");
      }
      throw err;
    }

    apiResponse(res, {
      statusCode: 201,
      message: "User registered successfully",
      data: user,
    });

    const verificationToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
    );

    const verificationLink = `${process.env.FRONTEND_URL || "https://yourfrontend.com"}/verify-email?token=${verificationToken}`;

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border-radius: 8px; background-color: #f9f9f9;">
        <h2 style="color: #333;">Verify Your Email</h2>
        <p style="color: #555;">Hello ${user.name || "there"},</p>
        <p style="color: #555;">
          Please verify your email to complete your registration.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #4f46e5; color: white; text-decoration: none; padding: 12px 20px; border-radius: 5px; font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p style="color: #555;">
          If you did not sign up, you can ignore this email.
        </p>
        <p style="color: #555;">Stay secure,<br />The Team</p>
      </div>
    `;

    await sendEmail(
      process.env.ALERT_SENDER_EMAIL || "rbh97995@gmail.com",
      process.env.ALERT_SENDER_NAME || "Monitor Website",
      { email: user.email, name: user.name || undefined },
      {
        subject: "Verify Your Email",
        htmlContent,
        textContent: `Please verify your email by visiting: ${verificationLink}`,
      },
    );
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const SignInUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const validation = LoginSchema.safeParse(req.body);

    if (!validation.success) {
      throw ErrorFactory.validation(validation.error);
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw ErrorFactory.unauthorized("Invalid email or password");
    }

    if (!user.password) {
      throw ErrorFactory.unauthorized("Invalid email or password");
    }

    const isValid = await comparePassword(password, user.password);

    if (!isValid) {
      throw ErrorFactory.unauthorized("Invalid email or password");
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        subPlan: user.subPlan,
        isEmailVerified: user.isEmailVerified,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.isEmailVerified,
    };

    apiResponse(res, {
      statusCode: 200,
      message: "Login successful",
      data: {
        token,
        user: safeUser,
      },
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const RequestForgetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      throw ErrorFactory.notFound("A valid email is required.");
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      apiResponse(res, {
        statusCode: 200,
        message:
          "If an account with this email exists, a password reset email has been sent.",
      });
      return;
    }

    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "1h" },
    );

    const resetLink = `${process.env.FRONTEND_URL || "https://yourfrontend.com"}/reset-password?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border-radius: 8px; background-color: #f9f9f9;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p style="color: #555;">Hello ${user.name || "there"},</p>
        <p style="color: #555;">
          We received a request to reset your password. Click the button below to set a new password. This link will expire in 1 hour for your security.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4f46e5; color: white; text-decoration: none; padding: 12px 20px; border-radius: 5px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #555;">
          If you did not request a password reset, you can safely ignore this email.
        </p>
        <p style="color: #555;">Stay secure,<br />The Team</p>
      </div>
    `;

    const emailResponse = await sendEmail(
      process.env.ALERT_SENDER_EMAIL || "rbh97995@gmail.com",
      process.env.ALERT_SENDER_NAME || "Monitor Website",
      { email: user.email, name: user.name || undefined },
      {
        subject: "Reset Your Password",
        htmlContent,
        textContent: `Reset your password by visiting the following link: ${resetLink}`,
      },
    );

    if (!emailResponse.success) {
      throw ErrorFactory.internal(
        "Failed to send reset email. Please try again later.",
      );
    }

    apiResponse(res, {
      statusCode: 200,
      message:
        "If an account with this email exists, a password reset email has been sent.",
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const ResetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      throw ErrorFactory.notFound(
        "Token, newPassword, and confirmPassword are required.",
      );
    }

    if (newPassword !== confirmPassword) {
      throw ErrorFactory.conflict("Passwords do not match.");
    }

    if (newPassword.length < 8) {
      throw ErrorFactory.conflict(
        "Password must be at least 8 characters long.",
      );
    }

    let payload;
    try {
      payload = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
      ) as {
        userId: string;
        email: string;
      };
    } catch (err) {
      console.error(err);
      throw ErrorFactory.unauthorized("Invalid or expired token.");
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.userId) },
    });

    if (!user) {
      throw ErrorFactory.notFound("User not found.");
    }

    const hashed = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    apiResponse(res, {
      statusCode: 200,
      message:
        "Password reset successfully. You can now sign in with your new password.",
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const VerifyEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      throw ErrorFactory.notFound("A valid token is required.");
    }

    let payload;
    try {
      payload = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
      ) as {
        userId: string;
        email: string;
      };
    } catch (err) {
      console.error("[Error in VerifyEmail]", err);
      throw ErrorFactory.unauthorized("Invalid or expired verification token.");
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.userId) },
    });

    if (!user) {
      throw ErrorFactory.notFound("User not found.");
    }

    if (user.isEmailVerified) {
      apiResponse(res, {
        statusCode: 200,
        message: "Email already verified.",
      });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });

    apiResponse(res, {
      statusCode: 200,
      message: "Email verified successfully. You can now sign in.",
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};

export const RequestEmailVerification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      throw ErrorFactory.unauthorized("Unauthorized user");
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isEmailVerified: true,
        verifiedEmailSent: true,
      },
    });

    if (!dbUser) {
      throw ErrorFactory.notFound("User not found.");
    }

    if (dbUser.isEmailVerified) {
      throw ErrorFactory.conflict("Email is already verified.");
    }

    const now = new Date();
    if (
      dbUser.verifiedEmailSent &&
      now.getTime() - dbUser.verifiedEmailSent.getTime() < 10 * 60 * 1000
    ) {
      const minutesLeft = Math.ceil(
        (10 * 60 * 1000 -
          (now.getTime() - dbUser.verifiedEmailSent.getTime())) /
        60000,
      );
      throw ErrorFactory.conflict(
        `Verification email recently sent. Please wait ${minutesLeft} minute(s) before requesting again.`,
      );
    }

    const verificationToken = jwt.sign(
      { userId: dbUser.id, email: dbUser.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
    );

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const emailContent = {
      subject: "Verify your email address",
      htmlContent: `
        <h2>Verify your email address</h2>
        <p>Hi ${dbUser.name || ""},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationLink}" style="
          display: inline-block;
          padding: 10px 20px;
          background-color: #4f46e5;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
        ">Verify Email</a>
        <p>If you did not create an account, please ignore this email.</p>
        <p><strong>Note:</strong> If you don't see the email in your inbox, please check your spam folder.</p>
      `,
      textContent: `Verify your email by visiting this link: ${verificationLink}\n\nIf you don't see the email in your inbox, please check your spam folder.`,
    };

    const sendResult = await sendEmail(
      process.env.ALERT_SENDER_EMAIL || "rbh97995@gmail.com",
      process.env.ALERT_SENDER_NAME || "Monitor Website",
      { email: dbUser.email, name: dbUser.name || undefined },
      emailContent,
    );

    if (!sendResult.success) {
      throw ErrorFactory.internal(
        `Failed to send verification email: ${sendResult.error?.message}`,
      );
    }

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { verifiedEmailSent: now },
    });

    apiResponse(res, {
      statusCode: 200,
      message:
        "Verification email sent successfully. Please check your inbox and spam folder.",
    });
  } catch (error) {
    globalErrorHandler(error as BaseError, req, res);
  }
};
