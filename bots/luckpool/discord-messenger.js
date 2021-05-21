//https://luckpool.net/verus/payments/RUYVdsamoaJ5JwB2YZyPHCAVXeNa87GV5Q
const fetch = require('node-fetch');
const fs = require('fs');
const BP = "C:/Users/pangz/Documents/Projects/Git/verus-apps-utils/bots/luckpool/";
const STATE_FILE = BP+'/state.json';
const LOG_FILE = BP+'/process.log';
const DISCORD_URI_TEST = 'https://discordapp.com/api/webhooks/700222471017594921/z7452sohRXZhRqGJUHCPtsJhCR00ANQkAXA0IolD3psCogdmymwJXAJQa8Dpp3ggGHNW';
const DISCORD_URI_LIVE = 'https://discordapp.com/api/webhooks/758004219247591564/rVB_WOjGoHjfBdN5fm-48B8pGCJY9qwBRrv6DFIFlszS0WVpzCuzYuQNGQmTp8TefFX_';
const DISCORD_URI = DISCORD_URI_LIVE;

const TADDRESS = 'RUYVdsamoaJ5JwB2YZyPHCAVXeNa87GV5Q';
const LUCKPOOL = {
    host: 'https://luckpool.net',
    verusEndpoint: 'verus/payments',
    verusMinedBlockEndpoint: 'verus/blocks',
};

const LUCKPOOL_PAYMENT = LUCKPOOL.host+'/'+LUCKPOOL.verusEndpoint+'/'+TADDRESS;
const LUCKPOOL_MINED_BLOCKS = LUCKPOOL.host+'/'+LUCKPOOL.verusMinedBlockEndpoint+'/'+TADDRESS;
const DEFAULT_STATES = {lastPaymentTx: "", "lastMinedBlockHash":"xxx", lastMinedBlockCount: 0};
const NORMAL_BLOCK_SIZE = 12;
const NORMAL_BLOCK_REWARD = 1;
const MEGA_BLOCK_THRESHOLD = 40;
const SHARE_PERCENTAGE = 0.75;
const EMBEDS_NORMAL_BLOCK = [
    {
      "color": null,
      "image": {
        "url": "https://media.tenor.com/images/670f5c308969af803acb73193c7ee39d/tenor.gif"
      }
    },
	{
      "color": null,
      "image": {
        "url": "https://gifimage.net/wp-content/uploads/2017/12/jackpot-gif-1-1.gif"
      }
    },
];
const EMBEDS_MEGA_BLOCK = [
	{
      "color": null,
      "image": {
        "url": "https://media.tenor.com/images/e79b3995a31c993ab6dc7f0e692385b4/tenor.gif"
      }
    },
    {
      "color": null,
      "image": {
        "url": "https://media.tenor.com/images/7907b2684b93d24e8e92636b5460fd74/tenor.gif"
      }
    },
];
const MESSAGE_LAST_PAYMENT = {
	username: 'Payment Reporter',
	content: ''
};
const MESSAGE_MINER_JACKPOT = {
	"username": 'Miner Reporter',
	"content": "",
	"embeds": []
};

async function main() {
	var states = await getStates();
	if(states == undefined) {
        saveStates(DEFAULT_STATES);
		states = await getStates();
    }    
    await checkLastPayment(states);
    await checkLastMinedBlock(states);
	await logMessage("execute");
}

async function getPoolStats(name) {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({
    width: 1829,
    height: 932,
    deviceScaleFactor: 10,
  });
  await page.goto('https://luckpool.net/verus/stats.html');
  const [button] = await page.$x('//*[@id="minersTable"]/thead/tr/th[4]');
  if (button) {
    await button.click();
  }
  await page.screenshot({ path: BP+'network_stats/'+name+'_stat.png' });
  await browser.close();
}

async function sendToChat(body) {
    fetch(DISCORD_URI, {
        method: 'post',
        body:    JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    }).then(json => console.log(json));
}

async function checkLastPayment(states) {
    const lastPayment = await fetchEndpointData(LUCKPOOL_PAYMENT);
	
    if(states.lastPaymentTx == lastPayment[0]) {
		return 0;
	}
	const paymentDetail = lastPayment[0].split(':');
	const transferAmount = paymentDetail[2];
	var message = MESSAGE_LAST_PAYMENT;
	message.content = '**New Payment Received!** ⛏💵\n*Amount in VRSC*: ```'+transferAmount+'```\n\n\n';
	states.lastPaymentTx = lastPayment[0];
	
	saveStates(states);
	sendToChat(message);
}

async function checkLastMinedBlock(states) {
    const lastMinedBlocks = await fetchEndpointData(LUCKPOOL_MINED_BLOCKS);
	const dataParts = lastMinedBlocks[0].split(":");
	const txHash = dataParts[0];
	
	if(states.lastMinedBlockHash.trim() == txHash.trim()) {
		return 0;
    }
	
	// const dataParts = lastMinedBlocks[0].split(":");
	// const txHash = dataParts[0];
	const minerName = dataParts[3].split(".");
	const blockSize = parseInt(dataParts[8])*0.00000001;
	const isHybridMiner = dataParts[3].includes('hybrid') ? true : false;
	const share = (isHybridMiner)? blockSize*SHARE_PERCENTAGE : NORMAL_BLOCK_REWARD;
	const isMegaBlock = (blockSize > NORMAL_BLOCK_SIZE && blockSize > blockSize+MEGA_BLOCK_THRESHOLD);
	const megaIndicator = (isMegaBlock) ? "▫️▫️▫️▫️💵💰⛏💎▫️▫️▫️▫️" : "️▫️▫️▫️💵💰️▫️▫️▫️";
	const mineCount = parseInt(states.lastMinedBlockCount)+1;
	var message = MESSAGE_MINER_JACKPOT;
	
	states.lastMinedBlockCount = mineCount;
	states.lastMinedBlockHash = txHash;
	message.content = megaIndicator+"\n\nYahooooo! 📢📢📢\n[Miner's Jackpot]("+LUCKPOOL.host+"/verus/miner.html?"+TADDRESS+"),\n\nLuck                : #"+mineCount+"\nMiner Name : "+minerName[1]+"\nType               : "+(isMegaBlock? "Mega" : "Normal")+"\nSize                 : "+blockSize+" VRSC\nShare              : "+share+" VRSC\nTx Hash         : ["+txHash+"](https://explorer.verus.io/block/"+txHash+")\n\n"+megaIndicator;
	message.embeds = (isMegaBlock)? EMBEDS_MEGA_BLOCK : EMBEDS_NORMAL_BLOCK;
	
	saveStates(states);
	sendToChat(message);
	getPoolStats(mineCount+'_'+minerName[1]);
}

async function fetchEndpointData(endpoint){
    let res = [];
    await fetch(endpoint)
        .then(res => res.json())
        .then(body => res = body);
    return res;
}

async function saveStates(data) {
    await fs.writeFile(STATE_FILE, ((data != null) ? JSON.stringify(data) : ''), {flag: 'w'}, (err) => {
        if (err) throw err;
        console.log('State file has been saved!');
    });
}

async function getStates() {
    try {
        await fs.accessSync(STATE_FILE, fs.constants.R_OK | fs.constants.W_OK);
        return await JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    } catch (err) {
        console.error('no access!');
        await saveStates(null)
    }    
}

async function logMessage(message) {
	const date_ob = new Date();
	const day = ("0" + date_ob.getDate()).slice(-2);
	const month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
	const year = date_ob.getFullYear();
	const hr = date_ob.getHours();
	const min = date_ob.getMinutes();
	const sec = date_ob.getSeconds();
	const date = month+"/"+day+"/"+year+" "+hr+":"+min+":"+sec;
	
	fs.writeFile(LOG_FILE, date+" >> "+message, {flag: 'w'}, (err) => {
        if (err) throw err;
        console.log('Log file has been saved!');
    });
}

main();