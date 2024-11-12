const { parseEther, formatEther, parseUnits, formatUnits, Contract } = require('ethers');

// amount = 0.5 ETH
const etherToWei = (amount) => {
  return parseEther(amount);
}

// amount = 1500000000000000000 WEI
const weiToEther = (amount) => {
  return formatEther(amount)
}

// amount = 0.5 ETH
const etherToGwei = (amount, unitName = 'gwei') => {
  return parseUnits(amount, unitName);
}

// amount = 5000000 GWEI
const gweiToEther = (amount, unitName = 'gwei') => {
  return formatUnits(amount, unitName);
}

const getContract = (ca, abi, provider) => {
  return new Contract(ca, abi, provider)
}

const transactionCostIncurred = (transactionData) => {
  const 
    gasUsed           = transactionData.gasUsed,
    effectiveGasPrice = transactionData.effectiveGasPrice
  ;

  // this will return the cost in wei
  const transactionCost = gasUsed.mul(effectiveGasPrice); 

  return weiToEther(transactionCost);
}

const totalSwapCost = (transactionCostIncurred, wethAmount) => {
  return transactionCostIncurred + wethAmount;
}

module.exports = {
  etherToWei,
  weiToEther,
  etherToGwei,
  gweiToEther,
  getContract,
  transactionCostIncurred,
  totalSwapCost
}