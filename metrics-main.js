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
let validators = {}; // данные по валидаторам
let proposals = {} // данные по пропосалам


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

///////////////////////////////////////////////////////////////////
// Convert Date to utc
function ConvertDateToUTC(date) {
	 let msUTC = Date.parse(date);
	 let dateUTC = new Date(msUTC);

	const options = {
	  hour12: false,
	  year: '2-digit',
	  month: 'short',
	  day: '2-digit',
	  timeZone: 'UTC',
	  timeZoneName:    'short',
	  hour: '2-digit',
	  minute: '2-digit',
	  second: '2-digit'
	 }
	 return dateUTC.toLocaleString('en-US',options);
}

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
// 		console.log("dataCrypto:", dataCrypto);
	},
	11000 //  <=  sec*1000 // 1800_000 = 30 min
);

//////////////////////////////////////////////////////////////////
// Get Validators
setTimeout(
	async () => {
		validators = await getValidators(chainData.daemon_name);
	}, 1111 // сначал через ~1 сек прочитаем валидаторов
);
setInterval(
	async () => {
		validators = await getValidators(chainData.daemon_name);
// 		console.log("validators:", validators);
	},
	19777 //  <=  sec*1000 // 1800_000 = 30 min
);

//////////////////////////////////////////////////////////////////
// Get Proposals
setTimeout(
	async () => {
		proposals = await getProposals(chainData.daemon_name);
	}, 2111 // сначал через ~1 сек прочитаем пропосалы
);
setInterval(
	async () => {
		console.time("getProposals");
		proposals = await getProposals(chainData.daemon_name);
// 		console.log("validators:", validators);
		console.timeEnd('getProposals');
	},
	29777 //  <=  sec*1000 // 1800_000 = 30 min
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

async function getProposals(chaind) {
//        const tmpJson = await execFile(chaind, ['q','gov','proposals','-o','json','--limit','3','--reverse']);
        const tmpJson = await execFile(chaind, ['q','gov','proposals','-o','json','--reverse']);
        return parseJson(tmpJson);
}

function getProposalsParam(props) {
//	console.log("props = ", props);
	// всего пропозалов
	let totalNumProposals = props.proposals.length;
	//let id = "";
	let arrProposals = [];
	// перебираем пропозалы
	for (let i = 0; i < totalNumProposals; i++) {
		proposalTmp = props.proposals[i];
		let proposalStr = "";
/*		if (typeof proposalTmp.proposals_id != "undefined")
			id = proposalTmp.proposals_id;
		if (typeof proposalTmp.id != "undefined")
			id = proposalTmp.id;
*/
		let id = proposalTmp.proposals_id || proposalTmp.id;
		let content = proposalTmp.content || proposalTmp.messages[0].content;
//		let status = proposalTmp.status;
		let final_tally_result = {};
		for (key in proposalTmp.final_tally_result) {
			//console.log(key);
			if (key.indexOf("yes") != -1) final_tally_result.yes = proposalTmp.final_tally_result[key];
			if (key.indexOf("abstain") != -1) final_tally_result.abstain = proposalTmp.final_tally_result[key];
			if (key == "no" || key == "no_count") final_tally_result.no = proposalTmp.final_tally_result[key];
			if (key.indexOf("no_with_veto") != -1) final_tally_result.no_with_veto = proposalTmp.final_tally_result[key];
		}
		//proposalStr += "proposal_id=\"" + id + "\",";
		for (key in content) {
			if (key.indexOf("type") != -1) proposalStr += "content_type=\"" + content[key].substr(content[key].lastIndexOf(".")+1) + "\",";
		}
		proposalStr += "content_title=\"" + content.title + "\",";
		proposalStr += "content_description=\"" + content.description + "\",";
		if (typeof content.plan != "undefined") {
                        proposalStr += "content_plan=\"" + JSON.stringify(content.plan).replace(/"/g,'') + "\"," + "content_changes=\"\",";
		}
		else if (typeof content.changes != "undefined")
                        proposalStr += "content_plan=\"\"," + "content_changes=\"" + JSON.stringify(content.changes).replace(/"/g,'') + "\",";
		else
                        proposalStr += "content_plan=\"\"," + "content_changes=\"\",";

		proposalStr += "status=\"" + proposalTmp.status.replace("PROPOSAL_STATUS_",'') + "\",";

		proposalStr += "yes=\"" + final_tally_result.yes + "\",";
		proposalStr += "abstain=\"" + final_tally_result.abstain + "\",";
		proposalStr += "no=\"" + final_tally_result.no + "\",";
		proposalStr += "no_with_veto=\"" + final_tally_result.no_with_veto + "\",";
		proposalStr += "submit_time=\"" + proposalTmp.submit_time + "\",";
		proposalStr += "deposit_end_time=\"" + proposalTmp.deposit_end_time + "\",";
		proposalStr += "voting_start_time=\"" + proposalTmp.voting_start_time + "\",";
		proposalStr += "voting_end_time=\"" + ConvertDateToUTC(proposalTmp.voting_end_time) + "\"";
		
		arrProposals.push({"proposalStr": proposalStr, "proposal_id": id});
	}
//	console.log(totalNumProposals);
	return {
                "totalNumProposals": totalNumProposals,
                "arrProposals": arrProposals
         };
}

async function getValidators(chaind) {
        const tmpJson = await execFile(chaind, ['q','staking','validators','-o','json','--limit','1000000']);
        return parseJson(tmpJson);
}
function getValidatorsParam(valiki) {
	// общее число валидаторов
	let totalNumValidators = valiki.validators.length;

	// перебираем валидаторы
	let activeValidators = 0;
	let minStake = (10**255);
	let validatorStr = "";
	let i = 0;
	let validatorTmp = {};
	console.log("min", minStake);
	let arrValidators = [];
	for(let i = 0; i < totalNumValidators; i++) {

		if (valiki.validators[i].status == "BOND_STATUS_BONDED" )
		{
			// считаем валидаторов в активном сете
			activeValidators++;
			// считаем минимальный stake
			if (Number(valiki.validators[i].tokens) < Number(minStake)) {
				minStake = Number(valiki.validators[i].tokens);
			}
		}
		// оформляем валидаторов
		validatorStr = "";
		validatorTmp = valiki.validators[i];
	  	j = 0;
		validatorStr += "operator_address" + "=\"" + validatorTmp.operator_address + "\","; //}

			if (validatorTmp.jailed == true) {
		        	validatorStr += "status" + "=\"" + "Jailed" + "\",";
			}
			else {
				if (validatorTmp.status == "BOND_STATUS_BONDED") {
					validatorStr += "status" + "=\"" + "Active" + "\",";
				}
				else if (validatorTmp.status == "BOND_STATUS_UNBONDED") {
					validatorStr += "status" + "=\"" + "Unbonded" + "\",";
				}
				else // (validatorTmp[key].status == "BOND_STATUS_UNBONDING")
				{
					validatorStr += "status" + "=\"" + "Unbonding" + "\",";
				}
			}
		validatorStr += "moniker" + "=\"" + validatorTmp.description.moniker + "\","; //}
                validatorStr += "commission" + "=\"" + (validatorTmp.commission.commission_rates.rate*100) + "\""; //}
		arrValidators.push({"validatorStr": validatorStr, "tokens": Number(validatorTmp.tokens)});
	}

//	console.log("arrValidators:", arrValidators);
	return {
		"totalNumValidators": totalNumValidators,
		"activeValidators": activeValidators,
		"minStake": minStake,
		"arrValidators": arrValidators
	 };
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
        //console.log("j1:", tmpJson);

	return parseJson(tmpJson);
}

async function getMinting(chaind) {
	const tmpJson = await execFile(chaind, ['q','mint','params','-o','json']);
        //console.log("j1:", tmpJson);
	return parseJson(tmpJson);
}

async function getDistribution(chaind) {
	const tmpJson = await execFile(chaind, ['q','distribution','params','-o','json']);
	//console.log("j1:", tmpJson);
	return parseJson(tmpJson);
}

async function getGov(chaind) {
	const tmpJson = await execFile(chaind, ['q','gov','params','-o','json']);
        //console.log("j1:", tmpJson);
	return parseJson(tmpJson);
}

async function getBank(chaind) {
	const tmpJson = await execFile(chaind, ['q','bank','total','-o','json']);
        //console.log("j1:", tmpJson);
	return parseJson(tmpJson);
}

async function getStakingPool(chaind) {
	const tmpJson = await execFile(chaind, ['q','staking','pool','-o','json']);
        //console.log("j1:", tmpJson);
	return parseJson(tmpJson);
}

async function getCommunityPool(chaind) {
	const tmpJson = await execFile(chaind, ['q','distribution','community-pool','-o','json']);
        //console.log("j1:", tmpJson);
	return parseJson(tmpJson);
}



setInterval(
  async () => {

  console.time('timeOutString');

  let str_tmp = "";
  function str (message) { str_tmp = str_tmp + message + "\n"; } 
  const binaryName = chainData.daemon_name;

  let varStatus = await getStatus(binaryName);
  let varVersion = await getVersion(binaryName);
  
  //console.log(varStatus);
  const chainId = varStatus.NodeInfo.network;


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
 str(`node_chain_info_links{chain_id="${chainId}",\
	title="Chain Registry", link="${linkChain}"} 1`);


  for (let key in chainData.codebase.binaries ) {
        //i++;
	str(`node_chain_info_binaries{chain_id="${chainId}", adc="${key}", binary="${chainData.codebase.binaries[key]}"} 1`);
  }


  let feeStr = ""; // = chainData.codebase.binaries;  
  let feetmp = chainData.fees.fee_tokens[0];
  let i = 0;
  for (let key in feetmp) {
	i++;
        feeStr += key + "=\"" + feetmp[key] + "\""; 
	if (i < Object.keys(feetmp).length) { feeStr += ",";}
  }
  str(`node_chain_info_fees{chain_id="${chainId}", ${feeStr}} 1`);



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

///////////////////////////////////////////////////////////////////////////
// DataMarket
//	dataCrypto ю
//  console.log("dataCrypto:", dataCrypto);
  try {
	  let crypto = Object.keys(dataCrypto)[0];
	  let ue = Object.keys(dataCrypto[crypto])[0]; 
	  str("# HELP node_crypto Data of Crypto with Market.");
	  str(`# TYPE node_crypto gauge`);

  	  for (key in dataCrypto[crypto]) {
	  str(`node_crypto{chain_id="${chainId}",\
	        crypto="${crypto}",\
		ue="${ue}", name="${key}" } ${dataCrypto[crypto][key]}`);
	  }
      }
  catch(err) {
	console.log("node_crypto err:", err);
  }

////////////////////////////////////////////////////////////////////////////
// Height
//"latest_block_height":"9279202","latest_block_time":"2023-07-04T07:51:00.653355024Z"
 let blockHeight = varStatus.SyncInfo;



 let msUTC = Date.parse(blockHeight.latest_block_time);
/* let date = new Date(msUTC);

const options = {
  hour12: false,
  year: '2-digit',
  month: 'short',
  day: '2-digit',
  timeZone: 'UTC',
  timeZoneName:    'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
};*/
// console.log(date.toLocaleString("en-US",options));

 str("# HELP node_block_height Height of Block.");
          str(`# TYPE node_block_height counter`);
         // str(`node_block_height{chain_id="${chainId}",\
         //       time="${date.toLocaleString('en-US',options)}"} ${blockHeight.latest_block_height}`);
	  str(`node_block_height{chain_id="${chainId}",\
                time="${ConvertDateToUTC(blockHeight.latest_block_time)}"} ${blockHeight.latest_block_height}`);
//"earliest_block_height":"9259981","earliest_block_time":"2023-07-03T00:34:47.282765186Z"

///////////////////////////////////////////////////////////////////////////
// Посчитаем среднее время блока

 let avgTimeBlock = (msUTC - Date.parse(blockHeight.earliest_block_time)) / (blockHeight.latest_block_height - blockHeight.earliest_block_height);
 str("# HELP node_time_block Time Block");
          str(`# TYPE node_time_block gauge`);
          str(`node_time_block{chain_id="${chainId}"} ${avgTimeBlock/1000}`);
	
///////////////////////////////////////////////////////////////////////////
//  Supply, Community Pool, Bond...

  let varBank = await getBank(binaryName);
  //console.log(varBank);
  let totalSupply = 0;
  for (let i = 0; i < varBank.supply.length; i++) {
	if (varBank.supply[i].denom == varMinting.mint_denom) {
		totalSupply = varBank.supply[i].amount;
		break;
	}
  }

  let varStakingPool = await getStakingPool(binaryName);
  let bond = varStakingPool.bonded_tokens;
  let unbonding = varStakingPool.not_bonded_tokens;
  let unbonded = totalSupply - bond - unbonding;

  let varCommunityPool = await getCommunityPool(binaryName);
  let communityPool = 0;
  for (let i = 0; i < varCommunityPool.pool.length; i++) {
        if (varCommunityPool.pool[i].denom == varMinting.mint_denom) {
                communityPool = varCommunityPool.pool[i].amount;
                break;
        }
  }
  let apr = (totalSupply * (varMinting.inflation_max * (1-varDistrib.community_tax))) / bond;
  str("# HELP node_bank_bond Supply, Community Pool, Bond...");
          str(`# TYPE node_bank_bond gauge`);
          str(`node_bank_bond{chain_id="${chainId}", param="Supply"} ${totalSupply/(10**exponent)}`);
          str(`node_bank_bond{chain_id="${chainId}", param="Bond"} ${bond/(10**exponent)}`);
          str(`node_bank_bond{chain_id="${chainId}", param="Unbonding"} ${unbonding/(10**exponent)}`);
          str(`node_bank_bond{chain_id="${chainId}", param="Unbonded"} ${unbonded/(10**exponent)}`);
          str(`node_bank_bond{chain_id="${chainId}", param="Community Pool"} ${communityPool/(10**exponent)}`);
          str(`node_bank_bond{chain_id="${chainId}", param="APR"} ${apr*100}`);

//////////////////////////////////////////////////////////////////////////////////////
// Validators

	let varValidators = getValidatorsParam(validators);
  str("# HELP node_validators Validators");
          str(`# TYPE node_validators gauge`);
          str(`node_valdators{chain_id="${chainId}", param="IdealActiveSet"} ${varStaking.max_validators}`);
          str(`node_valdators{chain_id="${chainId}", param="RealActiveSet"} ${varValidators.activeValidators}`);
          str(`node_valdators{chain_id="${chainId}", param="TotalNumValidators"} ${varValidators.totalNumValidators}`);
          str(`node_valdators{chain_id="${chainId}", param="minStake"} ${(varValidators.minStake)/(10**exponent)}`);
          for (let i in varValidators.arrValidators) {
            str(`node_validators{chain_id="${chainId}",bond_pre = "${(varValidators.arrValidators[i].tokens/bond)*100}", ${varValidators.arrValidators[i].validatorStr}}\
		 ${varValidators.arrValidators[i].tokens/(10**exponent)}`);
	  }

/////////////////////////////////////////////////////////////////////////////////////
// Proposals
	let varProposals = getProposalsParam(proposals);
//	console.log(varProposals);
   str("# HELP node_proposals Proposals");
          str(`# TYPE node_proposals gauge`);
          str(`node_proposals{chain_id="${chainId}", total_num_proposals="total_num_proposals"} ${varProposals.totalNumProposals}`);
          for (let i in varProposals.arrProposals) {
	   let j = Number(+i+1);
//		console.log(j);
            str(`node_proposals{chain_id="${chainId}", num="${j}", ${varProposals.arrProposals[i].proposalStr}} ${varProposals.arrProposals[i].proposal_id}`);
	  }
// arrProposals.push({"proposalStr": proposalStr, "proposal_id": id});
//	console.log("avgTimeBlock", avgTimeBlock);

/*
  if (oldMsUTC != 0 && oldBlockHeight != 0) {
   let deltaMsUTC = msUTC - oldMsUTC;
   let deltaBlockHeight = blockHeight.latest_block_height - oldBlockHeight;
   if (deltaMsUTC > 0 && deltaBlockHeight > 0) { 
   	let timeBlock = deltaMsUTC / deltaBlockHeight;

        arrTimeBlock.push(timeBlock);
	let sum = arrTimeBlock.reduce((acc, num) => acc + num, 0);
	avgTimeBlock = sum/arrTimeBlock.length;
 	if (arrTimeBlock.length == 10){
	        arrTimeBlock.shift();
	}
	   console.log("deltaMsUTC",deltaMsUTC);
	   console.log("deltaBlockHeight",deltaBlockHeight);
	   console.log("timeBlock",timeBlock);
	   console.log("avgTimeBlock",avgTimeBlock);
   }

 }
   oldMsUTC = msUTC;
   oldBlockHeight = blockHeight.latest_block_height; 
*/
//////////////////////////////////////////////////////////////////////////
// формируем СТРОКУ, которая пойдет в Прометеус
  outString = str_tmp;
//  console.log("outString:\n", outString);
   console.timeEnd('timeOutString');
 // console.log('Hello every 3 seconds');
  },
  10000 // 9,7+ sec
);

