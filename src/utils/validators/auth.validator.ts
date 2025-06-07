import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string(),
  email: z
    .string()
    .email()
    .nonempty()
    .transform((val) => val.toLowerCase()),
  password: z.string().nonempty().min(8, "Password must be 8 digits long"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z
    .string()
    .email()
    .nonempty()
    .transform((val) => val.toLowerCase()),
  password: z.string().nonempty("Password is required"),
});

export type LoginInput = z.infer<typeof LoginSchema>;
