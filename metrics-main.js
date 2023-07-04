const http = require('http');
const child_process = require('child_process'); 
const util = require('util');

/////////////////////////////////////////////////////////////////////
// вот это хозяйство надо будет в файл засунуть - config.json
const hostname = '0.0.0.0';
const port = 3010;
//const linkChain = "https://raw.githubusercontent.com/cosmos/chain-registry/5693e6f9c040da5959250e3beb96b543309195b5/bitcanna/chain.json"; 
const linkChain = "https://raw.githubusercontent.com/cosmos/chain-registry/master/bitcanna/chain.json";
//const linkAssetList = "https://raw.githubusercontent.com/cosmos/chain-registry/5693e6f9c040da5959250e3beb96b543309195b5/bitcanna/assetlist.json";
const linkAssetList = "https://raw.githubusercontent.com/cosmos/chain-registry/master/bitcanna/assetlist.json";
// данные по токенам беерм вот отсюда https://www.coingecko.com/en/api/documentation
const linkDataCrypto = "https://api.coingecko.com/api/v3/simple/price?ids=bitcanna&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true&precision=fuul";

/////////////////////////////////////////////////////////////////////



let chainData = {}; // дaнные из chain.json
let assetListData = {}; // дaнные из assetlist.json
let dataCrypto = {}; // данные из API биржы по нашему токену

// Promise
const execFile = util.promisify(
	require('child_process').execFile
);


////////////////////////////////////////////////////////////////////
// Create Server

let cntRequest = 0;
const server = http.createServer(async (request, response) => {
  console.log("Url: " + request.url);
 // console.log("Тип запроса: " + request.method);
 // console.log("User-Agent: " + request.headers["user-agent"]);
 // console.log("Все заголовки");
 // console.log(request.headers);

  let tmp = 'qwerty';
  switch(request.url) {

    case "/metrics":
	tmp = outString; // await Metrics(); 
        break;

    default:
	tmp = "abyrvalG";
  }

  cntRequest = cntRequest + 1;
  response.statusCode = 200;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  // response.write("<h2>hello Mikhail!!!</h2>");

  //let a = [{a: request.url, b: cnt, c: tmp}];
  //response.write(JSON.stringify(a));
  response.write(tmp);
 
  response.end();
});

////////////////////////////////////////////////////////////////// 
/////////////// Server listen //////////////////////////////////// 


server.listen(port, hostname, async () => {
  console.log(`Server running at http://${hostname}:${port}/`);
  // скачиваем конфигурационный файл чейна с гитхаба chain.json и assetlist.json
  chainData = await downloadChainFile(linkChain, "chain");
  assetListData = await downloadChainFile(linkAssetList, "assetlist");
});

//////////////////////////////////////////////////////////////////
// Download chain.json
// example mainnet: wget "https://raw.githubusercontent.com/cosmos/chain-registry/master/bitcanna/chain.json" // "https://raw.githubusercontent.com/cosmos/chain-registry/5693e6f9c040da5959250e3beb96b543309195b5/bitcanna/chain.json"
// example testnet: wget "https://raw.githubusercontent.com/cosmos/chain-registry/master/testnets/lavatestnet/chain.json"// "https://raw.githubusercontent.com/cosmos/chain-registry/5693e6f9c040da5959250e3beb96b543309195b5/testnets/lavatestnet/chain.json"

async function downloadChainFile(linkchain, targetfile) {
	let chaindata;
	try {
		// сначала скачиваем в tmp
		const a = await execFile('wget', [`--output-document=${targetfile}_tmp.json`,linkchain]);
		//console.log("stdout:", a);
		// если ошибки скачивания не было - заменяем на нужное имя
		await execFile('cp', [`${targetfile}_tmp.json`,`${targetfile}.json`]);
		// временный файл удаляем
		await execFile('rm', [`${targetfile}_tmp.json`]);

		const fs = require('fs');
		// синхронное чтение
		console.log(`Read file - ${targetfile}.json`);
		let fileContent = fs.readFileSync(`${targetfile}.json`, 'utf8');
		//console.log(fileContent);
		chaindata = JSON.parse(fileContent);
		// После парсинга переменной мы получаем объект, к свойствам которого можно обращаться как обычно, например чере "." 
		//console.log("1:", chainData.pretty_name);
		//console.log("2:", chainData.website);
		return chaindata;
	}
	catch (err) {
		console.log(`ERR downloadChainFile: File ${targetfile}.json not download`, err);
		console.log("ERR downloadChainFile: ", err);
		const fs = require('fs');
		// синхронное чтение
		//console.log('Синхронное чтение файла');
		try { 
			let fileContent = fs.readFileSync(`${targetfile}.json`, 'utf8');
			//console.log(fileContent);
			chaindata = JSON.parse(fileContent);
			console.log(`Chain data is taken from an old file ${targetfile}.json.`);
			//console.log("1:", chainData.pretty_name);
	                //console.log("2:", chainData.website);
			return chaindata;
		}
		catch (err) {
			console.log(`ERR downloadChainFile: File ${targetfile}.json not download`, err);
			console.log(`The old file ${targetfile}.json is missing.`);
			return chaindata = {};
		}
	}
}
/////////////////////////////////////////////////////////////////
// Будем переодически скачивать chain.json
setInterval(
	async () => {
		chainData = await downloadChainFile(linkChain, "chain");
		assetListData = await downloadChainFile(linkAssetList, "assetlist");
	},
	1800000 //  <=  sec*1000 // 1800_000 = 30 min
);

////////////////////////////////////////////////////////////////
// Будем переодически запрашивать курс на Coingecko

async function responseApi(url) {
	let response = await fetch(url);

	if (response.ok) { // если HTTP-статус в диапазоне 200-299
	  // получаем тело ответа 
	  let json = await response.json();
	  return json;
	} else {
	  console.log("Ошибка HTTP: " + response.status);
	  return {"error":"${response.status}"};
	}

}

setInterval(
	async () => {
		dataCrypto = await responseApi(linkDataCrypto);
 		console.log("dataCrypto:", dataCrypto);
	},
	11000 //  <=  sec*1000 // 1800_000 = 30 min
);


//////////////////////////////////////////////////////////////////
// Collection of metrics (Сбор метрик)
let outString = "HelloWorld";

function parseJson (tmpjson) {
	let content = {};
       	if (tmpjson.stdout.length > 0) 
	{
		content = JSON.parse(tmpjson.stdout);	
	}
	else if (content.stderr.length > 0) 
	{
		content = JSON.parse(tmpjson.stderr);
	}
	return content;
}

async function getStatus(chaind) {
        const tmpJson = await execFile(chaind, ['status','--log_format','json']);
        return parseJson(tmpJson);
}
async function getTotalSupply(chaind) {
	const tmpJson = await execFile(chaind, ['query','bank','total','-o','json']);
        // console.log("j1:", tmpJson);	
	return parseJson(tmpJson);
}


async function getVersion(chaind) {
	const tmpJson = await execFile(chaind, ['version','--long','-o','json']);
        //console.log("j1:", tmpJson);
	return parseJson(tmpJson);
}

async function getStaking(chaind) {
	const tmpJson = await execFile(chaind, ['q','staking','params','-o','json']);
        //console.log("j1:", tmpJson);
        return parseJson(tmpJson);
}

async function getSlashing(chaind) {
	const tmpJson = await execFile(chaind, ['q','slashing','params','-o','json']);
 /*       //console.log("j1:", tmpJson);
	const slashing = JSON.parse(tmpJson.stdout);
        //console.log("j2:", slashing);
        // console.log("j3:", totalSupply.supply.length-1);
	return slashing;
*/
	 return parseJson(tmpJson);
}

async function getMinting(chaind) {
	const tmpJson = await execFile(chaind, ['q','mint','params','-o','json']);
  /*      //console.log("j1:", tmpJson);
	const minting = JSON.parse(tmpJson.stdout);
        //console.log("j2:", slashing);
        // console.log("j3:", totalSupply.supply.length-1);
	return minting;
*/
	 return parseJson(tmpJson);
}

async function getDistribution(chaind) {
	const tmpJson = await execFile(chaind, ['q','distribution','params','-o','json']);
    /*    //console.log("j1:", tmpJson);
	const distrib = JSON.parse(tmpJson.stdout);
        //console.log("j2:", slashing);
        // console.log("j3:", totalSupply.supply.length-1);
	return distrib;
*/
	 return parseJson(tmpJson);
}

async function getGov(chaind) {
	const tmpJson = await execFile(chaind, ['q','gov','params','-o','json']);
/*        //console.log("j1:", tmpJson);
	const gov = JSON.parse(tmpJson.stdout);
        //console.log("j2:", slashing);
        // console.log("j3:", totalSupply.supply.length-1);
	return gov;
*/
	 return parseJson(tmpJson);
}



setInterval(
  async () => {

  let str_tmp = "";
  function str (message) { str_tmp = str_tmp + message + "\n"; } 
  const binaryName = chainData.daemon_name;

  let varStatus = await getStatus(binaryName);
  let varVersion = await getVersion(binaryName);
  
  //console.log(varStatus);
  const chainId = varStatus.NodeInfo.network;

//  console.log("chainData:", chainData);
//  let binaryStr = JSON.stringify(chainData.codebase.binaries);
/*  console.log("length:", Object.keys(chainData.codebase.binaries).length);
  let binaryStr = "binary"; // = chainData.codebase.binaries;  
  let i = 0;
  for (let key in chainData.codebase.binaries ) {
	i++;
	binaryStr += i + "=\"" + chainData.codebase.binaries[key]+"\""; 
	if (i < Object.keys(chainData.codebase.binaries).length) { binaryStr += ", binary";}
  }
*/
/*  let feeStr = ""; // = chainData.codebase.binaries;  
  let feetmp = chainData.fees.fee_tokens[0];
  for (let key in feetmp) {
	feeStr += key + " = " + feetmp[key] + ",\n"; 
  }
*/
  let exponent = assetListData.assets[0].denom_units[assetListData.assets[0].denom_units.length-1].exponent;
  str("# HELP node_chain_info Chain Info");
  str(`# TYPE node_chain_info gauge`);	
  str(`node_chain_info{chain_id="${chainId}",\
	 prettyname="${chainData.pretty_name}",\
	 bech32prefix="${chainData.bech32_prefix}",\
	 daemonname="${chainData.daemon_name}",\
	 node_home="${chainData.node_home}",\
	 slip44="${chainData.slip44}",\
	 keyalgos="${chainData.key_algos[0]}",\
	 ver="${varVersion.version}",\
	 tendermint_version="${varStatus.NodeInfo.version}",\
	 cosmos_sdk="${varVersion.cosmos_sdk_version}",\
	 denom="${assetListData.assets[0].base}",\
	 nativetoken="${assetListData.assets[0].display}",\
	 symboltoken="${assetListData.assets[0].symbol}",\
	 exponent="${assetListData.assets[0].denom_units[assetListData.assets[0].denom_units.length-1].exponent}"} 1`);

 str(`node_chain_info_links{chain_id="${chainId}",\
	title="WebSite", link="${chainData.website}"} 1`);
 str(`node_chain_info_links{chain_id="${chainId}",\
	title="GitHub Repo", link="${chainData.codebase.git_repo}"} 1`);
 str(`node_chain_info_links{chain_id="${chainId}",\
	title="Genesis URL", link="${chainData.codebase.genesis.genesis_url}"} 1`);



  for (let key in chainData.codebase.binaries ) {
        //i++;
	str(`node_chain_info_binaries{chain_id="${chainId}", adc="${key}", binary="${chainData.codebase.binaries[key]}"} 1`);
  }

//	 fee="${JSON.stringify(chainData.fees.fee_tokens[0])}",\


//  let feeStr = ""; // = chainData.codebase.binaries;  
/*  let feetmp = chainData.fees.fee_tokens[0];
  for (let key in feetmp) {
	str(`node_chain_info_fees{chain_id="${chainId}", ${key}="${feetmp[key]}"} 1`);
  }
*/
  let feeStr = ""; // = chainData.codebase.binaries;  
  let feetmp = chainData.fees.fee_tokens[0];
  let i = 0;
  for (let key in feetmp) {
	i++;
        feeStr += key + "=\"" + feetmp[key] + "\""; 
	if (i < Object.keys(feetmp).length) { feeStr += ",";}
  }
  str(`node_chain_info_fees{chain_id="${chainId}", ${feeStr}} 1`);

/*str("# HELP node_status Query remote node for status.");
  str(`# TYPE node_status gauge`);	
  str(`node_status{chain_id="${chainId}", tendermint_version="${varStatus.NodeInfo.version}", voting_power="${varStatus.ValidatorInfo.VotingPower}"} 1`);

  let varTotalSupply = await getTotalSupply(binaryName);
  //console.log(varTotalSupply);
  str("# HELP node_totalSuppy The total supply of coins of the chain.");
  str(`# TYPE node_totalSupply gauge`);	
  str(`node_totalSupply{chain_id="${chainId}", network_name="${chainData.pretty_name}", denom="${varTotalSupply.denom}"} ${varTotalSupply.amount}`);
  
  let varVersion = await getVersion(binaryName);
  //console.log(varVersion);
  str("# HELP node_version Print the application binary version information.");
  str(`# TYPE node_version gauge`);	
  str(`node_version{chain_id="${chainId}", binary_name="${binaryName}", name="${varVersion.name}", version="${varVersion.version}", cosmos_sdk="${varVersion.cosmos_sdk_version}" } 1`);
*/


//////////////////////////////////////////////
// Staking 

  let varStaking = await getStaking(binaryName);
  //console.log(varVersion);
  let unbondingDays = (parseFloat(varStaking.unbonding_time))/86400; // /60sec/60min/24hour => days
  i = 1;
  str("# HELP node_staking_max_validator Query values set as staking parameters.");
  str(`# TYPE node_staking_max_validator gauge`);	
  str(`node_staking_max_validator{chain_id="${chainId}", bonddenom="${varStaking.bond_denom}", unbondingtime="${unbondingDays} day(s)", maxentries="${varStaking.max_entries}", historicalentries="${varStaking.historical_entries}" } ${parseFloat(varStaking.max_validators)}`);
  
  str(`node_staking{chain_id="${chainId}",\
	 i="${i++}",\
         name_param="Bond Denom",\
	 param="${varStaking.bond_denom}"} 1`);
  str(`node_staking{chain_id="${chainId}",\
	 i="${i++}",\
	 name_param="Unbonding Time",\
	 param="${unbondingDays} day(s)"} 1`);
  str(`node_staking{chain_id="${chainId}",\
	 i="${i++}",\
	 name_param="Max Entries",\
	 param="${varStaking.max_entries}"} 1`);
  str(`node_staking{chain_id="${chainId}",\
	 i="${i++}",\
	 name_param="Historical Entries",\
	 param="${varStaking.historical_entries}"} 1`);
  str(`node_staking{chain_id="${chainId}",\
	 i="${i++}",\
	 name_param="Max Validators",\
	 param="${parseFloat(varStaking.max_validators)}"} 1`);




////////////////////////////////////////////////////////
// Slashing

  let varSlashing = await getSlashing(binaryName);
  //console.log(varVersion);
  i = 1;
  str("# HELP node_slashing_blk_windows Query the current slashing parameters.");
  str(`# TYPE node_slashing_blk_windows gauge`);
  str(`node_slashing_blk_windows{chain_id="${chainId}", downtimejailduration="${(parseFloat(varSlashing.downtime_jail_duration))} sec", minsignedperwindow="${(parseFloat(varSlashing.min_signed_per_window))*100}%",slashfractiondoublesign="${(parseFloat(varSlashing.slash_fraction_double_sign))*100}%",slashfractiondowntime="${(parseFloat(varSlashing.slash_fraction_downtime))*100}%"} ${parseFloat(varSlashing.signed_blocks_window)}`);
  str(`node_slashing{chain_id="${chainId}",\
	i="${i++}",\
	name_param="Downtime Jail Duration",\
	param="${(parseFloat(varSlashing.downtime_jail_duration))} sec",\
	} 1`);
  str(`node_slashing{chain_id="${chainId}",\
	i="${i++}",\
	name_param="Min Signed Per Window",\
	param="${(parseFloat(varSlashing.min_signed_per_window))*100}%",\
	} 1`);
  str(`node_slashing{chain_id="${chainId}",\
	i="${i++}",\
	name_param="Signed Block Window",\
	param="${parseFloat(varSlashing.signed_blocks_window)}",\
	} 1`);
  str(`node_slashing{chain_id="${chainId}",\
	i="${i++}",\
	name_param="Slash Fraction Double Sign",\
	param="${(parseFloat(varSlashing.slash_fraction_double_sign))*100}%",\
	} 1`);
  str(`node_slashing{chain_id="${chainId}",\
	i="${i++}",\
	name_param="Slash Fraction Downtime",\
	param="${(parseFloat(varSlashing.slash_fraction_downtime))*100}%"} 1`);


/////////////////////////////////////////////////////////////////////////////
// Minting

  let varMinting = await getMinting(binaryName);
//  let exponent = assetListData.assets[0].denom_units[1].exponent;
  i = 1;
  //console.log(varMinting);
  str("# HELP node_minting_blk_per_year Querying commands for the minting module.");
  str(`# TYPE node_minting_blk_per_year gauge`);
  str(`node_minting_blk_per_year{chain_id="${chainId}",\
	goalbonded="${(parseFloat(varMinting.goal_bonded))*100}%",\
	inflationmax="${(parseFloat(varMinting.inflation_max))*100}%",\
	inflationmin="${((parseFloat(varMinting.inflation_min))*100).toFixed(1)}%",\
	inflationratechange="${(parseFloat(varMinting.inflation_rate_change))*100}%",\
	mintdenom="${varMinting.mint_denom}"} ${parseFloat(varMinting.blocks_per_year)}`);

  str(`node_minting{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Mint Denom",\
        param="${varMinting.mint_denom}"} 1`);
  str(`node_minting{chain_id="${chainId}",\
	i="${i++}",\
	name_param="Blocks Per Year",\
	param="${parseFloat(varMinting.blocks_per_year)}"} 1`);
  str(`node_minting{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Goal Bonded",\
        param="${(parseFloat(varMinting.goal_bonded))*100}%"} 1`);
  str(`node_minting{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Inflation Max",\
        param="${(parseFloat(varMinting.inflation_max))*100}%"} 1`);
  str(`node_minting{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Inflation Min",\
        param="${((parseFloat(varMinting.inflation_min))*100).toFixed(1)}%"} 1`);
  str(`node_minting{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Inflation Rate Change",\
        param="${(parseFloat(varMinting.inflation_rate_change))*100}%"} 1`);

////////////////////////////////////////////////////////////////////////////////////
// Distribution

  let varDistrib = await getDistribution(binaryName);
  //console.log(varMinting);
  i = 1; 
  str("# HELP node_distrib Query distribution params.");
  str(`# TYPE node_distrib gauge`);
  str(`node_distrib{chain_id="${chainId}",\
	baseproposerreward="${(parseFloat(varDistrib.base_proposer_reward))*100}%",\
	bonusproposerreward="${(parseFloat(varDistrib.bonus_proposer_reward))*100}%",\
	communitytax="${((parseFloat(varDistrib.community_tax))*100)}%",\
	withdrawaddrenabled="${varDistrib.withdraw_addr_enabled}"} 1`);

 str(`node_distribution{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Base Proposer Reward",\
        param="${(parseFloat(varDistrib.base_proposer_reward))*100}%"} 1`);
 str(`node_distribution{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Bonus Proposer Reward",\
        param="${(parseFloat(varDistrib.bonus_proposer_reward))*100}%"} 1`);
 str(`node_distribution{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Community Tax",\
        param="${((parseFloat(varDistrib.community_tax))*100)}%"} 1`);
 str(`node_distribution{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Withdraw Address Enabled",\
        param="${varDistrib.withdraw_addr_enabled}"} 1`);


///////////////////////////////////////////////////////////////////////////
// Governance


  let varGov = await getGov(binaryName);
  //console.log(varMinting);
  let maxperiod = (parseFloat(varGov.deposit_params.max_deposit_period))/(86400*(10**9)); //nanosec /10^9 /60sec/60min/24hour => days
  let votingperiod = (parseFloat(varGov.voting_params.voting_period))/(86400*(10**9)); //nanosec /10^9/60sec/60min/24hour => days
  let mindepo = (parseFloat(varGov.deposit_params.min_deposit[0].amount))/(10**exponent);
  i = 1;
  str("# HELP node_gov Query the all the parameters for the governance process.");
  str(`# TYPE node_gov gauge`);
  str(`node_gov{chain_id="${chainId}",\
	maxdepositperiod="${maxperiod} day(s)",\
	mindeposit="${mindepo} ${varVersion.name}",\
	tally_quorum="${((parseFloat(varGov.tally_params.quorum))*100)}%",\
	tally_threshold="${((parseFloat(varGov.tally_params.threshold))*100)}%",\
	tally_veto_threshold="${((parseFloat(varGov.tally_params.veto_threshold))*100)}%",\
	votingperiod="${votingperiod} day(s)"} 1`);

  str(`node_governance{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Min Deposit",\
        param="${mindepo} ${varVersion.name}"} 1`); 
  str(`node_governance{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Max Deposit Period",\
        param="${maxperiod} day(s)"} 1`);
  str(`node_governance{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Quorum",\
        param="${((parseFloat(varGov.tally_params.quorum))*100)}%"} 1`);
  str(`node_governance{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Threshold",\
        param="${((parseFloat(varGov.tally_params.threshold))*100)}%"} 1`);
  str(`node_governance{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Veto Threshold",\
        param="${((parseFloat(varGov.tally_params.veto_threshold))*100)}%"} 1`);
  str(`node_governance{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Voting Period",\
        param="${votingperiod} day(s)"} 1`);

////////////////////////////////////////////////////////////////////////////////// 
// DataCrypto  - данные по ценам/объемам/процентам
  str(`node_num{chain_id="${chainId}",\
        i="${i++}",\
        param="[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]"} [1,2,3,4,5,6,5,4,3,4,5,6,7,8,9,8,7,2,0]`);


  outString = str_tmp;
  console.log("outString:\n", outString);


 // console.log('Hello every 3 seconds');
  },
  10000 // 9,7+ sec
);





