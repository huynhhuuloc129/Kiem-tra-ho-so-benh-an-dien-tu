// Address matching used by QUÉT theo BHYT (scanAddressMatch in content.js).
// Run: node Scan/tests/address.test.js
// Add a case here whenever HIS shows a new way of writing an address.
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
const block = src.slice(src.indexOf("// ADDRESS-MATCH-BEGIN"), src.indexOf("// ADDRESS-MATCH-END"));
if (!block) throw new Error("ADDRESS-MATCH-BEGIN / END markers not found in content.js");
const scanAddressMatch = new Function(`${block}\nreturn scanAddressMatch;`)();

const card = "142 Cầu Đen-Phường Sóc Trăng-Thành phố Cần Thơ";
// [expected, description, address A, address B]
const cases = [
  // Same person
  [true, "identical", card, card],
  [true, "Khóm 3 added", card, "142 Cầu Đen,Khóm 3-Phường Sóc Trăng-Thành phố Cần Thơ"],
  [true, "Khóm 3 not separated", card, "142 Cầu Đen Khóm 3-Phường Sóc Trăng-Thành phố Cần Thơ"],
  [true, "old names before the 2025 merger", card, "142 Cầu Đen,Khóm 3-Phường 8-Thành phố Sóc Trăng-Tỉnh Sóc Trăng"],
  [true, "Số prefix", card, "Số 142 Cầu Đen-Phường Sóc Trăng-Thành phố Cần Thơ"],
  [true, "Số nhà prefix", card, "Số nhà 142 Cầu Đen-Phường Sóc Trăng-Thành phố Cần Thơ"],
  [true, "đường word", card, "142 đường Cầu Đen-Phường Sóc Trăng-Thành phố Cần Thơ"],
  [true, "P. / TP. abbreviations", card, "142 Cầu Đen-P. Sóc Trăng-TP. Cần Thơ"],
  [true, "province left out", card, "142 Cầu Đen-Phường Sóc Trăng"],
  [true, "parts in another order", card, "Phường Sóc Trăng-142 Cầu Đen-Thành phố Cần Thơ"],
  [true, "TP.HCM", "12 Lê Lợi-Phường Bến Thành-TP.HCM", "12 Lê Lợi-Phường Bến Thành-Thành phố Hồ Chí Minh"],
  [true, "Phường 08 vs Phường 8", "Ấp 1-Phường 8-Tỉnh X", "Ấp 1-Phường 08-Tỉnh X"],
  [true, "P8 glued", "Ấp 1-Phường 8-Tỉnh X", "Ấp 1-P8-Tỉnh X"],
  [true, "KP3 vs Khu phố 3", "KP3-Phường A-Tỉnh X", "Khu phố 3-Phường A-Tỉnh X"],
  [true, "house number with slashes", "762/4/8A Tôn Đức Thắng-Phường X", "762/4/8A, Tôn Đức Thắng-Phường X"],
  [true, "ấp word left out", "Ấp Tân Mỹ-Xã Mỹ Hương-Thành phố Cần Thơ", "Tân Mỹ-Xã Mỹ Hương-Thành phố Cần Thơ"],
  [true, "province without unit word", "Ấp 1-Xã A-Sóc Trăng", "Ấp 1-Xã A-Cần Thơ"],
  [true, "house number left out", "5 Tô Hiến Thành-Phường A-TP X", "Tô Hiến Thành-Phường A-TP X"],
  [true, "only ward on one side", "Ấp 1-Xã A-Huyện B", "Xã A-Huyện B"],
  // Different people
  [false, "different house number", card, "150 Cầu Đen,Khóm 3-Phường Sóc Trăng-Thành phố Cần Thơ"],
  [false, "different street", card, "142 Lê Lợi-Phường Sóc Trăng-Thành phố Cần Thơ"],
  [false, "different ấp", "Ấp Tân Mỹ-Xã Mỹ Hương-Thành phố Cần Thơ", "Ấp Tân Phú-Xã Mỹ Hương-Thành phố Cần Thơ"],
  [false, "different khóm", "Khóm 3-Phường A-Tỉnh X", "Khóm 4-Phường A-Tỉnh X"],
  [false, "same ấp number, different xã", "Ấp 1-Xã A-Huyện B", "Ấp 1-Xã C-Huyện B"],
  [false, "ấp left out, different ấp", "Tân Mỹ-Xã Mỹ Hương", "Ấp Tân Phú-Xã Mỹ Hương"],
  [false, "empty address", card, ""]
];

let failed = 0;
for (const [expected, name, a, b] of cases) {
  for (const [x, y] of [[a, b], [b, a]]) {
    const got = scanAddressMatch(x, y);
    if (got !== expected) {
      failed++;
      console.log(`FAIL ${name}: expected ${expected ? "same" : "different"}\n  ${x}\n  ${y}`);
    }
  }
}
console.log(failed ? `${failed} failed` : `all ${cases.length} cases pass (both directions)`);
process.exit(failed ? 1 : 0);
