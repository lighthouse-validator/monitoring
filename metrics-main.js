const http = require('http'); const child_process = require('child_process'); const util = require('util');

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
// берем рабочую ноду со стороны - можно взять из chain.json - в идеале надо брать программно
const rpcprovider = "https://rpc.bitcanna.io:443";

/////////////////////////////////////////////////////////////////////



let chainData = {}; // дaнные из chain.json
let assetListData = {}; // дaнные из assetlist.json
let dataCrypto = {}; // данные из API биржы по нашему токену
let validators = {}; // данные по валидаторам
let proposals = {} // данные по пропосалам
let block_param = {};
let staking_pool = [];

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

// поиск последнего блока в пропосале

async function getBlockEndProposal() {	


 	async function binarySearch(block_param_currBlock, msVotingEnd){
	    let start = 0;
	    let end = +block_param_currBlock;

	    while (start <= end) {
	        let middle = Math.floor((start + end) / 2); // серединный блок
    		console.log("middle:", middle);
		 // читаем вычисленный блок
                let blockH = await getBlockHeight(chainData.daemon_name,middle);
                // определяем время блока Height
                let timeB = blockH.block.header.time;
                console.log("timeB:", timeB);
                let msUTCH = Date.parse(timeB);
                console.log("msUTCH:", msUTCH);
                console.log("msVotingEnd:", msVotingEnd);
	        //if (sortedArray[middle] === key) {
		if ((middle - start <= 1) || (end - middle <= 1) ) {
	            // found the key
		    console.log("finish:", middle);
	            return middle;
	        } else if (msUTCH < msVotingEnd) {
	            // continue searching to the right
	            start = middle + 1;
	
	        } else {
	            // search searching to the left
	            end = middle - 1;
	        }
		console.log("start:", start);
		console.log("end:", end);
	    }
		// key wasn't found
	    return 0;
	}


	for(let i = 0; i < 2; i++){
         let msNow = Date.parse(block_param.currTime); // в милисекундах
//              console.log("now:", Date.parse());
              console.log("currTime:", msNow);
              console.log("currblock:", block_param.currBlock);
                // берем время окончания голосования
         let msVotingEnd = Date.parse(proposals.proposals[i].voting_end_time); // в милисекундах
              console.log("endtime:", msVotingEnd);
                // берем время блока - его длина
                //let block.timeBlock;
                // берем текущий блок
                console.log("timeBlock:", block_param.timeBlock);

                // если пропосал завершился - вычисляем последний блок голосования
	 console.log("status:",proposals.proposals[i].status);
 	 //console.log("status:",proposals.proposals[i]);
	 let blockVotingEnd = 0;
         if (proposals.proposals[i].status == "PROPOSAL_STATUS_PASSED" || proposals.proposals[i].status == "PROPOSAL_STATUS_REJECTED") {
                blockVotingEnd = Math.trunc(block_param.currBlock - ((msNow - msVotingEnd)/(block_param.timeBlock)));
		console.log("blockVotingEnd:", blockVotingEnd);
		let flag = 0;

		// бинарный поиск нужного блока
		blockVotingEnd = await binarySearch(block_param.currBlock, msVotingEnd);

/*		while (blockVotingEnd > 0) {
			try {
				// читаем время вычисленного блока
				let blockH = await getBlockHeight(chainData.daemon_name,blockVotingEnd);

				// определяем время блока Height
				let timeB = blockH.block.header.time;
				console.log("timeB:", timeB);
				let msUTCH = Date.parse(timeB);
				console.log("msUTCH:", msUTCH);
				// если мы определили время и оно больше чем надо - будем отсчитывать блоки в зад
				if (msUTCH == msVotingEnd && flag == 0){
					break;
				}
				if (msUTCH > msVotingEnd && (flag == 0 || flag == -1) ){
					blockVotingEnd -= 10;
					flag = -1;
				}
				else if (msUTCH <= msVotingEnd && flag == -1) {
					break;
				}
				if (msUTCH < msVotingEnd && (flag == 0 || flag == 1) ){
					blockVotingEnd += 10;
					flag = 1;
				}
				else if (msUTCH >= msVotingEnd && flag == 1) {
					blockVotingEnd -=10;
					break;
				}
				console.log("Find blockVotingEnd:", blockVotingEnd);
			}
			catch (err) {
        	                console.log(`ERR getBlockHeight: `, err);
				blockVotingEnd = block_param.currBlock;
				break;
	                }
		}
*/  
         }
         else {
                blockVotingEnd = block_param.currBlock;
         }

	if (blockVotingEnd > 0) {
		let tmpJson = await execFile(chainData.daemon_name, ['q','staking','pool','-o','json','--height', blockVotingEnd, '--node', rpcprovider]);
		//console.log(parseJson(tmpJson));
		staking_pool[i] = parseJson(tmpJson);
		//console.log("blockVotingEnd--------",blockVotingEnd);
	}
       } // end for
}


setTimeout(
	async () => {
		await getBlockEndProposal();
	}, 14311 // сначал через ~1 сек прочитаем пропосалы
);

setInterval(
	async () => {
		await getBlockEndProposal();
   },
	3600577 //  <=  sec*1000 // 1800_000 = 30 min
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

async function getProposalsParam(props, blocks) {
//	console.log("props = ", props);
	// всего пропозалов
	let totalNumProposals = props.proposals.length;
	//let id = "";
	let arrProposals = [];
	let arrProposalsLast = [];
	let arrProposalsPreLast = [];
	let blockVotingEnd = 0;
//	let arrProposalsLastNotTable = [];
//	let arrProposalsPreLastNotTable = [];
	async function fillArrLast (index, strData, digit) {
		if (index == 0 || index == 1) {
			//arrProposalsLast.push({"str":strData,"digit":digit});
     			if (strData.indexOf("pool") != -1 && (staking_pool.length == 2) ) {
				//let tmpJson = await execFile(chainData.daemon_name, ['q','staking','pool','-o','json','--height', blockVotingEnd, '--node', rpcprovider]);
		                //console.log(parseJson(tmpJson));
				//let bt = parseJson(tmpJson);
				//console.log(bt.bonded_tokens);
				if (index == 0) {
					//console.log('staking_pool', staking_pool[0]);
					arrProposalsLast.push({"str":strData,"digit": staking_pool[index].bonded_tokens});
					//console.log(arrProposalsLast);
					//console.log('1');
				}
				if (index == 1) {arrProposalsPreLast.push({"str":strData,"digit": staking_pool[index].bonded_tokens});}
			}
                	else
			{
				if (index == 0) {arrProposalsLast.push({"str":strData,"digit":digit})};
				if (index == 1) {arrProposalsPreLast.push({"str":strData,"digit":digit});}
			}
		}
                /*if (index == 1) {
			arrProposalsPreLast.push({"str":strData,"digit":digit});
		}*/
	}

	function ConvertStr(str){
		console.log(str);
		let tmp = JSON.stringify(str).replace(/[\"]/g,''); // убираем кавычки
		console.log(tmp);
		tmp = JSON.stringify(tmp).replace(/[\{\}\[\]\"]/g,''); // убираем  скобки
		console.log(tmp);
		tmp = JSON.stringify(tmp).replace(/[\,]/g,',  \n'); // запятые меняем на перенос строки
		console.log(tmp);
		//tmp = JSON.stringify(tmp).replace(/[\"]/g,''); // убираем кавычки
		return tmp;
	}
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
		fillArrLast(i,`tabl="tabl", name_param="Id", param="${id}"`,0);
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

		proposalStr += "content_title=\"" + content.title + "\",";
		fillArrLast(i,`tabl="tabl",name_param="Title", param="${content.title}"`,0);

		proposalStr += "status=\"" + proposalTmp.status.replace("PROPOSAL_STATUS_",'') + "\",";
		fillArrLast(i,`tabl="tabl",name_param="Status", param="${proposalTmp.status.replace("PROPOSAL_STATUS_",'')}"`,0);

		//proposalStr += "proposal_id=\"" + id + "\",";
		for (key in content) {
			if (key.indexOf("type") != -1){
				proposalStr += "content_type=\"" + content[key].substr(content[key].lastIndexOf(".")+1) + "\",";
				fillArrLast(i,`tabl="tabl",name_param="Type", param="${content[key].substr(content[key].lastIndexOf('.')+1)}"`,0);
			}
		}
		// prposer - НАДО сделать!!!
//		let proposer = await getProposer(chainData.daemon_name, id);
//		proposalStr += "proposer=\"" + proposer.proposer + "\",";
//		fillArrLast(i,`tabl="tabl",name_param="Proposer", param="${proposer.proposer}"`);

		proposalStr += "submit_time=\"" + ConvertDateToUTC(proposalTmp.submit_time) + "\",";
		proposalStr += "deposit_end_time=\"" + ConvertDateToUTC(proposalTmp.deposit_end_time) + "\",";
		proposalStr += "voting_start_time=\"" + ConvertDateToUTC(proposalTmp.voting_start_time) + "\",";
		proposalStr += "voting_end_time=\"" + ConvertDateToUTC(proposalTmp.voting_end_time) + "\"";
		fillArrLast(i,`tabl="tabl",name_param="Submit Time", param="${ConvertDateToUTC(proposalTmp.submit_time)}"`,0);
                fillArrLast(i,`tabl="tabl",name_param="Deposit End Time", param="${ConvertDateToUTC(proposalTmp.deposit_end_time)}"`,0);
                fillArrLast(i,`tabl="tabl",name_param="Voting Start Time", param="${ConvertDateToUTC(proposalTmp.voting_start_time)}"`,0);
                fillArrLast(i,`tabl="tabl",name_param="Voting End Time", param="${ConvertDateToUTC(proposalTmp.voting_end_time)}"`,0);
		proposalStr += "content_description=\"" + content.description + "\",";
		fillArrLast(i,`tabl="tabl",name_param="Description", param="${content.description}"`,0);

		if (typeof content.plan != "undefined") {
			//let tmpstr = content.plan; //ConvertStr(content.plan);
                        proposalStr += "content_plan=\"" + JSON.stringify(content.plan).replace(/"/g,'') + "\"," + "content_changes=\"\",";
			//proposalStr += "content_plan=" + tmpstr + "," + "content_changes=\"\",";
			fillArrLast(i,`tabl="tabl",name_param="Plan", param="${JSON.stringify(content.plan).replace(/"/g,'')}"`,0);
			//fillArrLast(i,`tabl="tabl",name_param="Plan", param=${tmpstr}`);
		}
		else if (typeof content.changes != "undefined"){
			//let tmpstr = content.changes; //ConvertStr(content.changes);
                        proposalStr += "content_plan=\"\"," + "content_changes=\"" + JSON.stringify(content.changes).replace(/"/g,'') + "\",";
			fillArrLast(i,`tabl="tabl",name_param="Changes", param="${JSON.stringify(content.changes).replace(/"/g,'')}"`, 0);
                        //proposalStr += "content_plan=\"\"," + "content_changes=\"" + tmpstr + "\",";
			//fillArrLast(i,`tabl="tabl",name_param="Changes", param="${tmpstr}"`);
		}
		else {
                        proposalStr += "content_plan=\"\"," + "content_changes=\"\",";
		}

		proposalStr += "yes=\"" + final_tally_result.yes + "\",";
		proposalStr += "abstain=\"" + final_tally_result.abstain + "\",";
		proposalStr += "no=\"" + final_tally_result.no + "\",";
		proposalStr += "no_with_veto=\"" + final_tally_result.no_with_veto + "\"";
		//fillArrLast(i,`tabl="notabl",name_param="Yes", param="${final_tally_result.yes}"`);
		fillArrLast(i,`tabl="notabl",name_param="Yes"`, final_tally_result.yes);
		//fillArrLast(i,`tabl="notabl",name_param="No", param="${final_tally_result.no}"`);
		fillArrLast(i,`tabl="notabl",name_param="No"`, final_tally_result.no);
		//fillArrLast(i,`tabl="notabl",name_param="Abstain", param="${final_tally_result.abstain}"`);
		fillArrLast(i,`tabl="notabl",name_param="Abstain"`, final_tally_result.abstain);
		//fillArrLast(i,`tabl="notabl",name_param="Veto", param="${final_tally_result.no_with_veto}"`);
		fillArrLast(i,`tabl="notabl",name_param="Veto"`, final_tally_result.no_with_veto);

/*		let sum_votes = (final_tally_result.yes + final_tally_result.no + final_tally_result.abstain + final_tally_result.no_with_veto);
		proposalStr += "voted=\"" + sum_votes  + "\",";
		fillArrLast(i,`tabl="notabl", name_param="Voted"`, sum_votes);
*/
//////////////////////////////////////////////////
// Опеределяем номер блока в котором окончился пропосал
/*		// Берем время сейчас
		let msNow = Date.parse(blocks.currTime); // в милисекундах
//		console.log("now:", Date.parse());
//		console.log("currTime:", msNow);
//		console.log("currblock:", blocks.currBlock);
		// берем время окончания голосования
	        let msVotingEnd = Date.parse(proposalTmp.voting_end_time); // в милисекундах
//		console.log("endtime:", msVotingEnd);
		// берем время блока - его длина
	        //let block.timeBlock;
		// берем текущий блок
//		console.log("timeBlock:", blocks.timeBlock);

		// если пропосал завершился - вычисляем последний блок голосования
		if (proposalTmp.status == "PROPOSAL_STATUS_PASSED" || proposalTmp.status == "PROPOSAL_STATUS_REJECTED") {
			blockVotingEnd = Math.trunc(blocks.currBlock - ((msNow - msVotingEnd)/blocks.timeBlock));
		} 
		else {
			blockVotingEnd = blocks.currBlock;
		}
*/
//		console.log(blockVotingEnd);


		//let tmpJson = await execFile(chainData.daemon_name, ['q','staking','pool','-o','json','--height', blockVotingEnd, '--node', rpcprovider]);
	        //console.log(parseJson(tmpJson));

		await fillArrLast(i,`tabl="notabl2",name_param="pool"`, 1);


/////////////////////////////////////////////////

		arrProposals.push({"proposalStr": proposalStr, "proposal_id": id});
	}


/*str(`node_governance{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Min Deposit",\
        param="${mindepo} ${varVersion.name}"} 1`); 
*/

//	console.log(totalNumProposals);
	return {
                "totalNumProposals": totalNumProposals,
                "arrProposals": arrProposals,
                "arrProposalsLast": arrProposalsLast,
                "arrProposalsPreLast": arrProposalsPreLast
 //		"arrProposalsLastNotTable": arrProposalsLastNotTable,
//		"arrProposalsPreLastNotTable": arrProposalsPreLastNotTable
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

async function getProposer(chaind, id) {
        const tmpJson = await execFile(chaind, ['q','gov','proposer',id,'--node',chainData.apis.rpc[2].address,'-o','json']);
        return parseJson(tmpJson);
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

async function getBlockHeight(chaind,height) {
	const tmpJson = await execFile(chaind, ['q','block',height,'--node', rpcprovider]);    // , '-o','json']);
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

////////////////////////////////////////////////////////////////////
// Chain_Info

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


  for (let i in chainData.explorers) {
	str(`node_chain_info_explorers{chain_id="${chainId}", i="${(+i+1)}", explorer="${chainData.explorers[i].url}"} 1`);
  }
  for (let i in chainData.apis.rpc) {
	str(`node_chain_info_rpc{chain_id="${chainId}", i="${(+i+1)}", rpc="${chainData.apis.rpc[i].address}"} 1`);
  }
  for (let i in chainData.apis.grpc) {
	str(`node_chain_info_grpc{chain_id="${chainId}", i="${(+i+1)}", grpc="${chainData.apis.grpc[i].address}"} 1`);
  }
  for (let i in chainData.apis.rest) {
	str(`node_chain_info_rest{chain_id="${chainId}", i="${(+i+1)}", rest="${chainData.apis.rest[i].address}"} 1`);
  }



////////////////
//  Выделим rpc ноду
//  nodeFirst = chainData.apis.rpc[0];

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
        param="${((parseFloat(varGov.tally_params.quorum))*100)}%"} ${((parseFloat(varGov.tally_params.quorum))*100)}`);
  str(`node_governance{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Threshold",\
        param="${((parseFloat(varGov.tally_params.threshold))*100)}%"} ${((parseFloat(varGov.tally_params.threshold))*100)}`);
  str(`node_governance{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Veto Threshold",\
        param="${((parseFloat(varGov.tally_params.veto_threshold))*100)}%"} ${((parseFloat(varGov.tally_params.veto_threshold))*100)}`);
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

        block_param = {"timeBlock": avgTimeBlock, "currBlock": blockHeight.latest_block_height, "currTime": blockHeight.latest_block_time};
	let varProposals = await getProposalsParam(proposals, block_param);
//	console.log(varProposals);
   str("# HELP node_proposals Proposals");
          str(`# TYPE node_proposals gauge`);
          str(`node_proposals{chain_id="${chainId}", total_num_proposals="total_num_proposals"} ${varProposals.totalNumProposals}`);

//	console.log("Last:", varProposals.arrProposalsLast)
	  for (let i in varProposals.arrProposalsLast) {
		//console.log(varProposals.arrProposalsLast[i].str);
		//console.log(varProposals.arrProposalsLast[i].digit);
	        let j = Number(+i+1+10);
	        str(`node_proposals_last{chain_id="${chainId}", i="${j}", ${varProposals.arrProposalsLast[i].str}} ${varProposals.arrProposalsLast[i].digit/(10**exponent)}`);
	  }
//	console.log("PreLast:", varProposals.arrProposalsPreLast)
	  for (let i in varProposals.arrProposalsPreLast) {
	        let j = Number(+i+1+10);
	        str(`node_proposals_pre_last{chain_id="${chainId}", i="${j}", ${varProposals.arrProposalsPreLast[i].str}} ${varProposals.arrProposalsPreLast[i].digit/(10**exponent)}`);
	  }
          for (let i in varProposals.arrProposals) {
	   let j = Number(+i+1);
            str(`node_proposals{chain_id="${chainId}", num="${j}", ${varProposals.arrProposals[i].proposalStr}} ${varProposals.arrProposals[i].proposal_id}`);
	  }

/*   str("# HELP node_proposals_total Proposals total");
          str(`# TYPE node_proposals_total gauge`);
          str(`node_proposals_total{chain_id="${chainId}", name_param="Total Votes"} ${bond/(10**exponent)}`);
          str(`node_proposals_total{chain_id="${chainId}", name_param="Voted"} ${bond/(10**exponent)}`);
*/
// arrProposals.push({"proposalStr": proposalStr, "proposal_id": id});
//	console.log("avgTimeBlock", avgTimeBlock);
/*
str(`node_governance{chain_id="${chainId}",\
        i="${i++}",\
        name_param="Quorum",\
        param="${((parseFloat(varGov.tally_params.quorum))*100)}%"} 1`);
*/
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

