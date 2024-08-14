const charSet = "!@#$%^&*()1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function permuteString(str, seed) {
  let arr = str.split('');
  let permuted = new Array(arr.length);
  let randomIndexes = generateRandomIndexes(arr.length, seed);
  for (let i = 0; i < arr.length; i++) {
    permuted[randomIndexes[i]] = arr[i];
  }
  return permuted.join('');
}
function generateRandomIndexes(length, seed) {
  let indexes = [...Array(length).keys()];
  let randomIndexes = [];
  for (let i = 0; i < length; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    let randomIndex = Math.floor((seed / 233280) * indexes.length);
    randomIndexes.push(indexes[randomIndex]);
    indexes.splice(randomIndex, 1);
  }
  return randomIndexes;
}
function dePermuteString(str, seed) {
  let arr = str.split('');
  let dePermuted = new Array(arr.length);
  let randomIndexes = generateRandomIndexes(arr.length, seed);
  for (let i = 0; i < arr.length; i++) {
    dePermuted[i] = arr[randomIndexes[i]];
  }
  return dePermuted.join('');
}
function iclik(text) {
  let encrypted = '';
  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    let textIndex = charSet.indexOf(char);
    if (textIndex !== -1) {
      let newIndex = (textIndex + 3) % charSet.length;
      encrypted += charSet[newIndex];
    } else {
      encrypted += char;
    }
  }
  return permuteString(encrypted, 42);
}
function ngiclik(encryptedText) {
  let dePermutedText = dePermuteString(encryptedText, 42);
  let decrypted = '';
  for (let i = 0; i < dePermutedText.length; i++) {
    let char = dePermutedText[i];
    let textIndex = charSet.indexOf(char);
    if (textIndex !== -1) {
      let newIndex = (textIndex - 3 + charSet.length) % charSet.length;
      decrypted += charSet[newIndex];
    } else {
      decrypted += char;
    }
  }
  return decrypted;
}
module.exports = { iclik, ngiclik };