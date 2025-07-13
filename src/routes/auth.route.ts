import { Router } from "express";
import {
  RegisterUser,
  SignInUser,
  RequestForgetPassword,
  ResetPassword,
  VerifyEmail,
  RequestEmailVerification,
} from "../controller/auth.controller";
import { verifyPartialRequest } from "../middleware/auth.middleware";

const AuthRouter = Router();

AuthRouter.route("/register").post(RegisterUser);
AuthRouter.route("/signIn").post(SignInUser);
AuthRouter.route("/request-reset-password").post(RequestForgetPassword);
AuthRouter.route("/reset-password").post(ResetPassword);
AuthRouter.route("/verify-email").post(VerifyEmail);
AuthRouter.route("/request-email-verification").post(
  verifyPartialRequest,
  RequestEmailVerification,
);
export default AuthRouter;
