import { Router } from "express";
import {
  RegisterUser,
  SignInUser,
  RequestForgetPassword,
  ResetPassword,
  VerifyEmail,
} from "../controller/auth.controller";

const AuthRouter = Router();

AuthRouter.route("/register").post(RegisterUser);
AuthRouter.route("/signIn").post(SignInUser);
AuthRouter.route("/request-reset-password").post(RequestForgetPassword);
AuthRouter.route("/reser-password").post(ResetPassword);
AuthRouter.route("/verify-email").post(VerifyEmail);

export default AuthRouter;
