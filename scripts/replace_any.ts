import fs from "fs";
let data = fs.readFileSync("src/types.ts", "utf8");
data = data.replace(/createdAt\??:\s*any;/g, "createdAt?: AppTimestamp;");
data = data.replace(/updatedAt\??:\s*any;/g, "updatedAt?: AppTimestamp;");
fs.writeFileSync("src/types.ts", data);
console.log("Replaced any with AppTimestamp in types.ts");
