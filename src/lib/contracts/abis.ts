// Minimal ABIs for Bonzo/Beefy vault contracts

export const CLM_VAULT_ABI = [
  // Deposit/Withdraw
  "function deposit(uint256 _amount0, uint256 _amount1, uint256 _minShares) external",
  "function withdraw(uint256 _shares, uint256 _minAmount0, uint256 _minAmount1) external",
  "function withdrawAll(uint256 _minAmount0, uint256 _minAmount1) external",

  // Read functions
  "function balances() external view returns (uint256 amount0, uint256 amount1)",
  "function wants() external view returns (address token0, address token1)",
  "function want() external view returns (address)",
  "function previewDeposit(uint256 _amount0, uint256 _amount1) external view returns (uint256 shares, uint256 amount0, uint256 amount1, uint256 fee0, uint256 fee1)",
  "function previewWithdraw(uint256 _shares) external view returns (uint256 amount0, uint256 amount1)",
  "function isCalm() external view returns (bool)",
  "function swapFee() external view returns (uint256)",
  "function price() external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function strategy() external view returns (address)",
] as const;

export const CLM_STRATEGY_ABI = [
  // Keeper functions
  "function harvest() external payable",
  "function harvest(address _callFeeRecipient) external payable",
  "function moveTicks() external payable",
  "function panic(uint256 _minAmount0, uint256 _minAmount1) external",

  // Read functions
  "function balances() external view returns (uint256 token0Bal, uint256 token1Bal)",
  "function balancesOfThis() external view returns (uint256 token0Bal, uint256 token1Bal)",
  "function isCalm() external view returns (bool)",
  "function price() external view returns (uint256)",
  "function positionMain() external view returns (int24 tickLower, int24 tickUpper)",
  "function positionAlt() external view returns (int24 tickLower, int24 tickUpper)",
  "function positionWidth() external view returns (int24)",
  "function lpToken0() external view returns (address)",
  "function lpToken1() external view returns (address)",
  "function pool() external view returns (address)",
  "function lastHarvest() external view returns (uint256)",
  "function paused() external view returns (bool)",
  "function keeper() external view returns (address)",
  "function owner() external view returns (address)",
] as const;

export const V7_VAULT_ABI = [
  // Deposit/Withdraw
  "function deposit(uint256 _amount) external",
  "function withdraw(uint256 _shares) external",
  "function depositAll() external",
  "function withdrawAll() external",

  // Read functions
  "function balance() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function want() external view returns (address)",
  "function getPricePerFullShare() external view returns (uint256)",
  "function strategy() external view returns (address)",
] as const;

export const V7_STRATEGY_ABI = [
  // Keeper functions
  "function harvest() external",
  "function panic() external",

  // Read functions
  "function balanceOf() external view returns (uint256)",
  "function paused() external view returns (bool)",
  "function want() external view returns (address)",
  "function vault() external view returns (address)",
  "function keeper() external view returns (address)",
  "function owner() external view returns (address)",
] as const;

export const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
] as const;
