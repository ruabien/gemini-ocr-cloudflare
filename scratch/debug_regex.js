const provinceMap = {
  "hồ chí minh": "HCM",
  "hà nội": "HN",
  "đà nẵng": "ĐN",
  "cần thơ": "CT",
  "hải phòng": "HP",
  "đắk lắk": "ĐL",
  "nghệ an": "NA",
  "thái bình": "TB",
  "kiên giang": "KG",
  "đồng nai": "ĐNai",
  "bình dương": "BD",
  "long an": "LA",
  "an giang": "AG",
  "tây ninh": "TN",
  "quảng nam": "QN",
  "quảng ngãi": "QNg",
  "khánh hòa": "KH",
  "lâm đồng": "LĐ"
};

const bBefore = '(?<=^|[^\\p{L}\\p{N}])';
const bAfter = '(?=$|[^\\p{L}\\p{N}])';
const provPrefixPattern = '(tỉnh|thành\\s+phố|Thành\\s+phố|TP\\.|TP|Tp\\.|tp\\.|tp|Tp)';
const provKeys = Object.keys(provinceMap).sort((a, b) => b.length - a.length);
const provPattern = provKeys.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');

const provinceRegex = new RegExp(
  `(${bBefore})(${provPrefixPattern})\\s+(${provPattern})${bAfter}`,
  'giu'
);

const text = "Ông Nguyễn Văn Bình, sinh năm 1975, địa chỉ: 123 Nguyễn Huệ, phường Bến Nghé, Quận 1, thành phố Hồ Chí Minh, CCCD số 034176012469, số điện thoại 0912345678.";

console.log("provPattern:", provPattern);
console.log("provinceRegex:", provinceRegex);
const match = text.match(provinceRegex);
console.log("Match result:", match);