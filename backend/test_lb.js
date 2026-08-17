const mongoose = require('mongoose');
require('dotenv').config();
const { router } = require('./routes/leaderboard');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    try {
      const handler = router.stack.find(l => l.route.path === '/').route.stack[1].handle;
      const req = {};
      const res = {
        json: (data) => console.log('ok:', JSON.stringify(data, null, 2)),
        status: (code) => {
          console.log('status:', code);
          return { json: (data) => console.log('err data:', JSON.stringify(data, null, 2)) };
        }
      };
      
      await handler(req, res);
      
    } catch(e){
        console.error('FAIL', e);
    }
    process.exit(0);
});
