import bcryptjs from "bcryptjs";
const saltRounds = process.env.SALT_ROUNDS
  ? parseInt(process.env.SALT_ROUNDS, 10)
  : 10;

export const hashPassword = async (password: string): Promise<string> => {
  const hashedPassword = await bcryptjs.hash(password, saltRounds);
  return hashedPassword;
};

export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  const validPassword = await bcryptjs.compare(plainPassword, hashedPassword);
  return validPassword;
};
