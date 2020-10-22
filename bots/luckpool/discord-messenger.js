//https://luckpool.net/verus/payments/RUYVdsamoaJ5JwB2YZyPHCAVXeNa87GV5Q
const fetch = require('node-fetch');
const fs = require('fs');
const STATE_FILE = process.cwd()+'/state.json';
const TADDRESS = 'RUYVdsamoaJ5JwB2YZyPHCAVXeNa87GV5Q';
const LUCKPOOL = {
    host: 'https://luckpool.net',
    verusEndpoint: 'verus/payments'
};

const LUCKPOOL_PAYMENT = LUCKPOOL.host+'/'+LUCKPOOL.verusEndpoint+'/'+TADDRESS;
const DISCORD_URI_TEST = 'https://discordapp.com/api/webhooks/700222471017594921/z7452sohRXZhRqGJUHCPtsJhCR00ANQkAXA0IolD3psCogdmymwJXAJQa8Dpp3ggGHNW';
const DISCORD_URI_LIVE = 'https://discordapp.com/api/webhooks/758004219247591564/rVB_WOjGoHjfBdN5fm-48B8pGCJY9qwBRrv6DFIFlszS0WVpzCuzYuQNGQmTp8TefFX_';
const DISCORD_URI = DISCORD_URI_LIVE;

main();

async function main() {
    await checkLastPaymet();    
}

async function sendToChat(transferAmount, totalPaid) {
    const body = {
        username: 'Payment Reporter',
        // content: '```**New Payment Transferred!**```\n*Amount in VRSC*: '+transferAmount+'\n*Total Paid*:'+totalPaid,
        content: '**New Payment Received!** ⛏💵\n*Amount in VRSC*: ```'+transferAmount+'```\n\n\n',
    };
    fetch(DISCORD_URI, {
        method: 'post',
        body:    JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    })
    // .then(res => res.json())
      .then(json => console.log(json));
}

async function checkLastPaymet() {
    const lastPayment = await getLastTx()
    const states = await getStates();   
    
    if(states == undefined) {
        saveStates({lastPaymentTx: lastPayment[0]});
        return
    }    
    if(states.lastPaymentTx !== lastPayment[0]) {
        const paymentDetail = lastPayment[0].split(':');
        saveStates({lastPaymentTx: lastPayment[0]}); 
        sendToChat(paymentDetail[2])
    }   
    
}

async function getLastTx(){
    let res = [];
    await fetch(LUCKPOOL_PAYMENT)
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