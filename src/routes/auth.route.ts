import { Router } from "express";
import { RegisterUser, SignInUser } from "../controller/auth.controller";

const AuthRouter = Router();

AuthRouter.route("/register").post(RegisterUser);
AuthRouter.route("/signIn").post(SignInUser);

export default AuthRouter;
