import rawData from "./rawBlocksData.json";

// Convert the complex array into a simple { "DistrictName": ["Block1", "Block2"] } format
const blocksData = {};

rawData.forEach((districtObj) => {
  // Title-case the district name to match your locationData.js (e.g., "MEERUT" -> "Meerut")
  const districtName = districtObj.name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // Extract just the block names from the nested blockList array
  const blocks = districtObj.blockList.map(block => 
    block.name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  );

  blocksData[districtName] = blocks;
});

export default blocksData;