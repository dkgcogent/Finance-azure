const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/features/actual/pages');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove import ActualNav
    content = content.replace(/import ActualNav from "\.\.\/components\/ActualNav"\n?/, '');
    
    // Remove <ActualNav /> usage
    content = content.replace(/<ActualNav \/>\n?\s*/g, '');

    fs.writeFileSync(filePath, content);
  }
});

console.log("ActualNav removed from all pages.");
