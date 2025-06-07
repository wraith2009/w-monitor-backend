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
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
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
