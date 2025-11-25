const fs = require('fs');
const path = require('path');
const { parse } = require('json2csv');

const splits = ['train', 'val', 'test'];

splits.forEach((split) => {
  const rawPath = path.join(
    __dirname,
    `../archive/vizwiz_data_ver1/data/Annotations/${split}.json`
  );

  let annotations;
  try {
    const rawData = fs.readFileSync(rawPath, 'utf-8');
    annotations = JSON.parse(rawData);
    console.log(`🔍 Loaded ${annotations.length} entries from ${split}.json`);
  } catch (err) {
    console.error(`❌ Failed to load ${split}.json: ${err.message}`);
    return;
  }

  const isValid = (entry) =>
    entry &&
    typeof entry.image === 'string' &&
    typeof entry.question === 'string' &&
    Array.isArray(entry.answers) &&
    entry.answers.length > 0 &&
    typeof entry.answers[0].answer === 'string' &&
    entry.image.trim() &&
    entry.question.trim() &&
    entry.answers[0].answer.trim() &&
    !['unanswerable', 'unsuitable'].includes(entry.answers[0].answer.trim().toLowerCase());

  const filtered = annotations.filter(isValid);
  console.log(`✅ Filtered ${filtered.length} valid entries from ${split}.json`);

  const cleaned = filtered.map((entry) => ({
    image: `images/${entry.image.trim()}`,
    question: entry.question.trim(),
    answer: entry.answers[0].answer.trim()
  }));

  const outputDir = path.join(__dirname, '../data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  try {
    fs.writeFileSync(
      path.join(outputDir, `cleaned_${split}.json`),
      JSON.stringify(cleaned, null, 2)
    );
    console.log(`📁 Saved cleaned_${split}.json`);
  } catch (err) {
    console.error(`❌ Failed to save cleaned_${split}.json: ${err.message}`);
  }

  try {
    const csv = parse(cleaned, { fields: ['image', 'question', 'answer'] });
    fs.writeFileSync(path.join(outputDir, `cleaned_${split}.csv`), csv);
    console.log(`📁 Saved cleaned_${split}.csv`);
  } catch (err) {
    console.error(`❌ Failed to save cleaned_${split}.csv: ${err.message}`);
  }
});