import { Empire } from './empire.js';

async function main(){
  try{
    const empire = new Empire();
    // Handle shutdown
    process.on('SIGINT', async ()=>{
      console.log('\nShutting down Empire...');
      try{ empire.stop(); }catch(e){}
      process.exit(0);
    });

    console.log('Starting local Empire (approval server + CEO + orchestrator)...');
    await empire.initialize();
    console.log('Empire initialized. (Use npm run empire to run via package script)');

  }catch(e){
    console.error('Failed to start Empire:', e);
    process.exit(1);
  }
}

main();
