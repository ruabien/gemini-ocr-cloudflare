const text = "Bùi Nguyễn Tòng –sinh năm 1968, Hà Thị Kim Cúc– sinh năm 1964";

const shortNameMap = new Map<string, string>();
shortNameMap.set("Tòng", "T");
shortNameMap.set("Cúc", "C");

let outText = text;
const bBefore = '(?<=^|[^\\p{L}\\p{N}])';

for (const [shortName, initial] of shortNameMap.entries()) {
  const escapedShortName = shortName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${bBefore}((?:\\p{Lu}\\p{Ll}*\\s+){1,4})${escapedShortName}(?=[^\\p{L}\\p{N}]|$)`, 'gu');
  console.log("Regex:", regex);
  outText = outText.replace(regex, (match, prefix) => {
    console.log("Matched!", match, "Prefix:", prefix);
    return `${prefix.trim()} ${initial}`;
  });
}

console.log("Output:", outText);