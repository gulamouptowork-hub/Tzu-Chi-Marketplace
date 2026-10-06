import { Noto_Sans_TC } from "next/font/google";

const chinese = Noto_Sans_TC({
  subsets: ["latin"],
  weight: "400",
  display: "optional",
  preload: false,
});
export const fullChineseFamily = chinese.style.fontFamily;
