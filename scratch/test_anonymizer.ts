import { anonymizeLegalText } from "../src/utils/anonymizer";

const tests = [
  "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
  "Địa chỉ: 746 đường 30/4, phường Hưng Lợi, quận Ninh Kiều, thành phố Cần Thơ.",
  "Địa chỉ: Thôn Mỹ Thạnh Trung 1, xã X, huyện Y, tỉnh Z.",
  "Địa chỉ: xã T, huyện V, tỉnh Thái Bình.",
  "Viện kiểm sát nhân dân quận Ninh Kiều, thành phố Cần Thơ."
];

tests.forEach((t) => {
  console.log("IN :", t);
  console.log("OUT:", anonymizeLegalText(t).text);
  console.log("STATS:", anonymizeLegalText(t).stats);
  console.log("---");
});