// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CarbonLedger
 * @dev Smart contract for immutable carbon stock recording and verification
 * @notice Stores carbon sequestration data with tamper-proof guarantees
 */
contract CarbonLedger {
    
    struct CarbonRecord {
        uint256 recordId;
        address farmer;
        string farmId;
        string plotId;
        string treeId;
        uint256 carbonValue; // Carbon in grams (to avoid decimals)
        uint256 biomassValue; // Biomass in grams
        string dataHash; // Hash of the complete carbon data
        string methodology; // Calculation method used
        uint256 timestamp;
        bool isVerified;
        address verifier;
        string ipfsHash; // Optional: link to detailed data on IPFS
    }
    
    struct CarbonCredit {
        uint256 creditId;
        uint256 recordId;
        address farmer;
        uint256 creditsGenerated; // Credits in wei (18 decimals)
        uint256 priceUSD; // Price in cents (to avoid decimals)
        bool isMinted;
        bool isTraded;
        address currentOwner;
        uint256 mintTimestamp;
    }
    
    // State variables
    uint256 private recordCounter;
    uint256 private creditCounter;
    address public owner;
    mapping(address => bool) public authorizedVerifiers;
    mapping(uint256 => CarbonRecord) public carbonRecords;
    mapping(uint256 => CarbonCredit) public carbonCredits;
    mapping(address => uint256[]) public farmerRecords;
    mapping(string => uint256[]) public plotRecords;
    
    // Events
    event CarbonRecorded(
        uint256 indexed recordId,
        address indexed farmer,
        string farmId,
        string plotId,
        uint256 carbonValue,
        string dataHash,
        uint256 timestamp
    );
    
    event CarbonVerified(
        uint256 indexed recordId,
        address indexed verifier,
        uint256 timestamp
    );
    
    event CreditMinted(
        uint256 indexed creditId,
        uint256 indexed recordId,
        address indexed farmer,
        uint256 creditsGenerated,
        uint256 timestamp
    );
    
    event CreditTraded(
        uint256 indexed creditId,
        address indexed from,
        address indexed to,
        uint256 priceUSD,
        uint256 timestamp
    );
    
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyVerifier() {
        require(authorizedVerifiers[msg.sender], "Only authorized verifiers can call this function");
        _;
    }
    
    modifier validRecord(uint256 recordId) {
        require(recordId > 0 && recordId <= recordCounter, "Invalid record ID");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        recordCounter = 0;
        creditCounter = 0;
        authorizedVerifiers[msg.sender] = true; // Owner is default verifier
    }
    
    /**
     * @dev Record carbon data on blockchain
     * @param farmId Unique identifier for the farm
     * @param plotId Unique identifier for the plot
     * @param treeId Unique identifier for the tree (optional)
     * @param carbonValue Carbon sequestered in grams
     * @param biomassValue Biomass measured in grams
     * @param dataHash Hash of the complete carbon calculation data
     * @param methodology Calculation method used (e.g., "IPCC 2006")
     * @param ipfsHash Optional IPFS hash for additional data
     */
    function recordCarbonData(
        string memory farmId,
        string memory plotId,
        string memory treeId,
        uint256 carbonValue,
        uint256 biomassValue,
        string memory dataHash,
        string memory methodology,
        string memory ipfsHash
    ) external returns (uint256) {
        recordCounter++;
        
        CarbonRecord memory newRecord = CarbonRecord({
            recordId: recordCounter,
            farmer: msg.sender,
            farmId: farmId,
            plotId: plotId,
            treeId: treeId,
            carbonValue: carbonValue,
            biomassValue: biomassValue,
            dataHash: dataHash,
            methodology: methodology,
            timestamp: block.timestamp,
            isVerified: false,
            verifier: address(0),
            ipfsHash: ipfsHash
        });
        
        carbonRecords[recordCounter] = newRecord;
        farmerRecords[msg.sender].push(recordCounter);
        plotRecords[plotId].push(recordCounter);
        
        emit CarbonRecorded(
            recordCounter,
            msg.sender,
            farmId,
            plotId,
            carbonValue,
            dataHash,
            block.timestamp
        );
        
        return recordCounter;
    }
    
    /**
     * @dev Verify a carbon record (only authorized verifiers)
     * @param recordId ID of the record to verify
     */
    function verifyCarbonRecord(uint256 recordId) 
        external 
        onlyVerifier 
        validRecord(recordId) 
    {
        require(!carbonRecords[recordId].isVerified, "Record already verified");
        
        carbonRecords[recordId].isVerified = true;
        carbonRecords[recordId].verifier = msg.sender;
        
        emit CarbonVerified(recordId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Mint carbon credits based on verified carbon record
     * @param recordId ID of the verified carbon record
     * @param creditsGenerated Amount of credits to mint (in wei, 18 decimals)
     * @param priceUSD Price per credit in cents
     */
    function mintCarbonCredits(
        uint256 recordId,
        uint256 creditsGenerated,
        uint256 priceUSD
    ) external validRecord(recordId) returns (uint256) {
        CarbonRecord storage record = carbonRecords[recordId];
        require(record.farmer == msg.sender, "Only record owner can mint credits");
        require(record.isVerified, "Record must be verified before minting credits");
        
        creditCounter++;
        
        CarbonCredit memory newCredit = CarbonCredit({
            creditId: creditCounter,
            recordId: recordId,
            farmer: msg.sender,
            creditsGenerated: creditsGenerated,
            priceUSD: priceUSD,
            isMinted: true,
            isTraded: false,
            currentOwner: msg.sender,
            mintTimestamp: block.timestamp
        });
        
        carbonCredits[creditCounter] = newCredit;
        
        emit CreditMinted(
            creditCounter,
            recordId,
            msg.sender,
            creditsGenerated,
            block.timestamp
        );
        
        return creditCounter;
    }
    
    /**
     * @dev Trade carbon credits
     * @param creditId ID of the credit to trade
     * @param newOwner Address of the new owner
     * @param priceUSD Trading price in cents
     */
    function tradeCarbonCredit(
        uint256 creditId,
        address newOwner,
        uint256 priceUSD
    ) external {
        require(creditId > 0 && creditId <= creditCounter, "Invalid credit ID");
        CarbonCredit storage credit = carbonCredits[creditId];
        require(credit.currentOwner == msg.sender, "Only current owner can trade");
        require(newOwner != address(0), "Invalid new owner address");
        
        address previousOwner = credit.currentOwner;
        credit.currentOwner = newOwner;
        credit.isTraded = true;
        credit.priceUSD = priceUSD;
        
        emit CreditTraded(creditId, previousOwner, newOwner, priceUSD, block.timestamp);
    }
    
    /**
     * @dev Get carbon record details
     * @param recordId ID of the record
     */
    function getCarbonRecord(uint256 recordId) 
        external 
        view 
        validRecord(recordId) 
        returns (CarbonRecord memory) 
    {
        return carbonRecords[recordId];
    }
    
    /**
     * @dev Get carbon credit details
     * @param creditId ID of the credit
     */
    function getCarbonCredit(uint256 creditId) 
        external 
        view 
        returns (CarbonCredit memory) 
    {
        require(creditId > 0 && creditId <= creditCounter, "Invalid credit ID");
        return carbonCredits[creditId];
    }
    
    /**
     * @dev Get all record IDs for a farmer
     * @param farmer Address of the farmer
     */
    function getFarmerRecords(address farmer) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return farmerRecords[farmer];
    }
    
    /**
     * @dev Get all record IDs for a plot
     * @param plotId ID of the plot
     */
    function getPlotRecords(string memory plotId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return plotRecords[plotId];
    }
    
    /**
     * @dev Verify data integrity by checking hash
     * @param recordId ID of the record
     * @param dataToVerify Hash of data to verify against stored hash
     */
    function verifyDataIntegrity(uint256 recordId, string memory dataToVerify) 
        external 
        view 
        validRecord(recordId) 
        returns (bool) 
    {
        return keccak256(abi.encodePacked(carbonRecords[recordId].dataHash)) == 
               keccak256(abi.encodePacked(dataToVerify));
    }
    
    /**
     * @dev Add authorized verifier (only owner)
     * @param verifier Address to authorize as verifier
     */
    function addVerifier(address verifier) external onlyOwner {
        require(verifier != address(0), "Invalid verifier address");
        authorizedVerifiers[verifier] = true;
        emit VerifierAdded(verifier);
    }
    
    /**
     * @dev Remove authorized verifier (only owner)
     * @param verifier Address to remove from verifiers
     */
    function removeVerifier(address verifier) external onlyOwner {
        authorizedVerifiers[verifier] = false;
        emit VerifierRemoved(verifier);
    }
    
    /**
     * @dev Get total number of records
     */
    function getTotalRecords() external view returns (uint256) {
        return recordCounter;
    }
    
    /**
     * @dev Get total number of credits
     */
    function getTotalCredits() external view returns (uint256) {
        return creditCounter;
    }
    
    /**
     * @dev Emergency function to pause contract (only owner)
     */
    bool public isPaused = false;
    
    modifier whenNotPaused() {
        require(!isPaused, "Contract is paused");
        _;
    }
    
    function pauseContract() external onlyOwner {
        isPaused = true;
    }
    
    function unpauseContract() external onlyOwner {
        isPaused = false;
    }
}
