const fs = require("fs/promises");
const { transparentBackground } = require("transparent-background");

const removeBackground = async(path) => {
    const input = await fs.readFile(path);
	const output = await transparentBackground(input, "png", {
		fast: false,
	});
	return output
}
module.exports = { removeBackground };