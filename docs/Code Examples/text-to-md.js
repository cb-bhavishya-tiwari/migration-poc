// === EXAMPLE 1: Basic Transformation ===

const input1 = "Title\n===\nContent"
// Actual string:
// Title
// ===
// Content

const output1 = formatMarkdown(input1)
// Actual string:
// # Title
// 
// Content

console.log(input1)
// Title
// ===
// Content

console.log(output1)
// # Title
// 
// Content

// === EXAMPLE 2: Emoji Transformation ===

const input2 = "Hot :fire: feature"
// No newlines, just emoji code

const output2 = formatMarkdown(input2)
// "Hot 🔥 feature"

console.log(output2)  // Hot 🔥 feature

// === EXAMPLE 3: Bold Transformation ===

const input3 = "This is __bold__ text"
const output3 = formatMarkdown(input3)  // "This is **bold** text"

console.log(input3)   // This is __bold__ text
console.log(output3)  // This is **bold** text