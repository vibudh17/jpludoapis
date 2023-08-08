const express = require('express');
const User = require('../Model/User');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Auth = require('../Middleware/Auth');
const RoleBase = require('../Middleware/Role');
const twofactor = require('node-2fa');
const https = require('https');
const path = require('path');
const Game = require('../Model/Games');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const randomstring = require('randomstring');
const myTransaction = require('../Model/myTransaction');
const AdminEarning = require('../Model/AdminEaring');
const Transaction = require('../Model/transaction');
const GatewaySettings = require('../Model/Gateway');
const profanity = require('profanity-hindi');
// let phoneNumber=undefined;
const storage = multer.memoryStorage();
const upload = multer({ storage });

const code_gen = async () => {
  let code = Math.floor(Math.random() * 1000000);
  let check = await User.findOne({ referral_code: code });
  if (check) {
    return code_gen();
  }
  return code;
};

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, "public/profilepic");
//     },
//     filename: function (req, file, cb) {
//         const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//         cb(null, uniqueSuffix + path.extname(file.originalname));
//     },
// });
// const fileFilter = (req, file, cd) => {
//     if (
//         (file.mimetype === "image/jpg",
//             file.mimetype === "image/jpeg",
//             file.mimetype === "image/png")
//     ) {
//         cd(null, true);
//     } else {
//         cd(null, false);
//     }
// };

// const upload = multer({
//     storage: storage,
//     limits: {
//         fileSize: 100000000000,
//     },
// });

router.post(
  '/users/me/avatar',
  Auth,
  upload.single('avatar'),
  async (req, res) => {
    //console.log(req.file);
    fs.access('./public/profilepic', (error) => {
      if (error) {
        fs.mkdirSync('./public/profilepic');
      }
    });
    const { buffer, originalname } = req.file;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);

    const ref = `${uniqueSuffix}.webp`;
    //console.log(buffer);
    await sharp(buffer)
      .webp({ quality: 20 })
      .toFile('./public/profilepic/' + ref);

    (req.user.avatar = 'public/profilepic/' + ref), await req.user.save();
    res.send();
  },
  (error, req, res, next) => {
    res.status(400).send({ error: error.message });
  }
);

router.patch('/agent/permission/:id', async (req, res) => {
  try {
    const permission = [
      { Permission: 'dashboard', Status: false },
      { Permission: 'earning', Status: false },
      { Permission: 'allAdmins', Status: false },
      { Permission: 'newAdmin', Status: false },
      { Permission: 'allUsers', Status: false },
      { Permission: 'newUser', Status: false },
      { Permission: 'pendingKyc', Status: false },
      { Permission: 'completedKyc', Status: false },
      { Permission: 'rejectKyc', Status: false },
      { Permission: 'allChallenge', Status: false },
      { Permission: 'completedChallenge', Status: false },
      { Permission: 'conflictChallenge', Status: false },
      { Permission: 'cancelledChallenge', Status: false },
      { Permission: 'runningChallenge', Status: false },
      { Permission: 'newChallenge', Status: false },
      { Permission: 'penaltyBonus', Status: false },
      { Permission: 'depositHistory', Status: false },
      { Permission: 'withdrawlHistory', Status: false },
      { Permission: 'allWithdrawlReq', Status: false },
      { Permission: 'allDepositReq', Status: false },
      { Permission: 'pages', Status: false },
      { Permission: 'bonusHistory', Status: false },
      { Permission: 'bonusReport', Status: false },
      { Permission: 'withdrawalReport', Status: false },
      { Permission: 'depositReport', Status: false },
      { Permission: 'penaltyReport', Status: false },
    ];

    const data = await User.findByIdAndUpdate(
      req.params.id,
      { $push: { Permissions: permission } },
      { new: true }
    );
    res.send(data);
  } catch (e) {
    res.send(e);
    console.log(e);
  }
});
router.post('/agent/permission/nested/:id', Auth, async (req, res) => {
  try {
    const updateResult = await User.findOneAndUpdate(
      { 'Permissions._id': req.params.id },
      { 'Permissions.$.Status': req.body.Status }
    );
    res.send(updateResult);
  } catch (e) {
    res.send(e);
    console.log(e);
  }
});

// router.post('/users/me/avatar', Auth, upload.single('avatar'), async (req, res) => {
//     if(req.file.path){

//         req.user.avatar = req.file.path,
//         await req.user.save()
//         res.send()
//     }else{
//     }

// }, (error, req, res, next) => {
//     res.status(400).send({ error: error.message })
// })

router.delete('/users/me/avatar', Auth, async (req, res) => {
  req.user.avatar = undefined;
  await req.user.save();
  res.send();
});

router.get('/users/avatar/:id', Auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || !user.avatar) {
      throw new Error();
    }

    res.set('Content-Type', 'image/png');
    res.send(user.avatar);
  } catch (e) {
    res.status(404).send();
  }
});

router.post('/admin/register', async (req, res) => {
  const { Name, Password, Phone, user_type, twofactor_code } = req.body;
  try {
    let user = await User.findOne({ Phone });
    if (user) {
      return res.send('Phone have already');
    }

    user = new User({
      Name,
      Password,
      Phone,
      user_type,
      referral_code: await code_gen(),
    });

    const token = await user.genAuthToken();

    const salt = await bcrypt.genSalt(10);
    user.Password = await bcrypt.hash(user.Password, salt);

    user.save();
    res.status(200).send({ msg: 'success', user, token });
  } catch (e) {
    res.status(400).send(e);
    console.log(e);
  }
});
router.get('/agent/all', Auth, async (req, res) => {
  try {
    const admin = await User.find({ user_type: 'Agent' });
    res.status(200).send(admin);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.post('/login', async (req, res) => {
  try {
    const { Password, Phone, referral, twofactor_code } = req.body;
    console.log(req.body);

    const Name = randomstring.generate({
      length: 5,
      charset: 'alphabetic',
    });
    const SecretCode = twofactor.generateSecret({ name: Name, Phone: Phone });
    const newSecret = twofactor.generateToken(SecretCode.secret);
    console.log(newSecret.token);
    let user = await User.findOne({ Phone: Phone });
    if (user != null) {
      if (user.user_type == 'Block') {
        return res.json({
          msg: 'You are Blocked. Please contact to admin.',
          status: 101, // Custom Status for Inbuild Use Says That 2fa Authentication is required
        });
      }

      if (user.Phone === 1111111111) {
        user.otp = newSecret.token;
        user.save();

        console.log('send otp to Test');

        return res.json({
          status: 200, // Custom Status for Inbuild Use Says That 2fa Authentication is required
          msg: 'Authentication Required',
          secret: SecretCode.secret,
          myToken: newSecret.token,
        });
      }

      user.otp = newSecret.token;
      user.save();

      // https.get(
      //   `https://www.fast2sms.com/dev/bulkV2?authorization=DZi9YlavXpnbjaxkvvFGy1UatpdNcdhOF6uHbOjt0ozezFIJgwji0IfxeUME4&route=dlt&sender_id=WPISMS&message=148262&variables_values=${newSecret.token}%7C&flash=0&numbers=${Phone}`,
      //   (resp) => {
      //     console.log('send 1');
      //   }
      // );

      https.get(
        `https://www.fast2sms.com/dev/bulkV2?authorization=kvASD0KaEZYte14xLuQJ7rV25dmgp3MqHF6woCzfRsUXTP98lO2yfN5JXWzx1O3SKsqHmVPguidGZYcb&route=dlt&sender_id=JPLUDO&message=157995&variables_values=${newSecret.token}%7C&flash=0&numbers=${Phone}`,
        (resp) => {
          console.log('send 1');
        }
      );

      return res.json({
        status: 200, // Custom Status for Inbuild Use Says That 2fa Authentication is required
        msg: 'Authentication Required',
        secret: SecretCode.secret,
        returnUrl: 'vibu',
      });
    } else if (user == null) {
      console.log('new user register', referral);
      let referralBy = referral;
      const Exist = await User.find({ referral_code: referral });
      if (Exist.length != 1) {
        referralBy = null;
      }
      const newUser = new User({
        Name,
        Password: '12345',
        Phone,
        user_type: 'User',
        referral: referralBy,
        referral_code: await code_gen(),
      });
      const salt = await bcrypt.genSalt(10);
      newUser.Password = await bcrypt.hash(newUser.Password, salt);
      newUser.otp = newSecret.token;
      await newUser.save();
      // const token = await user.genAuthToken();

      https.get(
        `https://www.fast2sms.com/dev/bulkV2?authorization=kvASD0KaEZYte14xLuQJ7rV25dmgp3MqHF6woCzfRsUXTP98lO2yfN5JXWzx1O3SKsqHmVPguidGZYcb&route=dlt&sender_id=JPLUDO&message=157995&variables_values=${newSecret.token}%7C&flash=0&numbers=${Phone}`,
        (resp) => {
          console.log('send 2');
        }
      );

      return res.json({
        status: 200, // Custom Status for Inbuild Use Says That 2fa Authentication is required
        msg: 'Authentication Required',
        secret: SecretCode.secret,
        returnUrl: 'vibu',
      });
    }
    console.log(newSecret.token);
  } catch (e) {
    res.status(400).send(e);
    console.log(e);
  }
});

router.post('/login/finish', async (req, res) => {
  console.log('finish call ghaov 👍');
  const { Phone, referral, twofactor_code, secretCode } = req.body;
  console.log('secredt key', secretCode);
  try {
    let user = await User.findOne({ Phone: Phone });
    if (user != null) {
      if (user.otp != twofactor_code) {
        console.log('Invalid Two Factor Code');
        return res.send({ msg: 'Invalid OTP', status: 101 });
      } else if (user.user_type == 'Block') {
        console.log('You are Blocked. Please contact to admin.');

        return res.json({
          msg: 'You are Blocked. Please contact to admin.',
          status: 101,
        });
      } else {
        const matched = twofactor.verifyToken(secretCode, twofactor_code);
        if (matched == null) {
          return res.json({ status: 101, msg: 'Invalid OTP!' });
        } else {
          console.log('match3d resuldt', matched.delta);

          //if(matched.delta==0){
          const token = await user.genAuthToken();
          res.status(200).send({
            status: 200,
            msg: 'login successful',
            token,
            user,
          });
          // }
          //else {
          //    return res.json({ status:101, msg: "OTP Expired. Please try again!" });
          //}
        }
      }
    } else if (user == null) {
      console.log('user not exit byt');
      return res.status(200).send({ msg: 'Invalid User', status: 101 });
    }
  } catch (e) {
    res.status(400).send(e);
    console.log(e);
  }
});

router.get('/all/user/data/get', Auth, async (req, res) => {
  try {
    let todaySuccessAmount = 0;
    let todayCommission = 0;
    let todayTotalDeposit = 0;
    let todayTotalWithdraw = 0;
    let totolWonAmount = 0;
    let totalLoseAmount = 0;
    let totalHoldBalance = 0;
    let totalWithdrawHold = 0;
    let totalDeposit = 0;
    let totalWithdrawl = 0;
    let totalReferralEarning = 0;
    let totalReferralWallet = 0;
    let totalWalletbalance = 0;
    var now = new Date();
    var startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const totalUser = await User.find({ user_type: 'User' });
    const todayUser = await User.find({
      $and: [{ createdAt: { $gte: startOfToday } }, { user_type: 'User' }],
    }).countDocuments();
    const todaySuccessGame = await Game.find({
      $and: [{ createdAt: { $gte: startOfToday } }, { Status: 'completed' }],
    });
    const todayCancelGame = await Game.find({
      $and: [{ createdAt: { $gte: startOfToday } }, { Status: 'cancelled' }],
    }).countDocuments();
    const todayAllGame = await Game.find({
      createdAt: { $gte: startOfToday },
    }).countDocuments();
    const totalGame = await Game.find().countDocuments();
    const todayCommissionEntry = await AdminEarning.find({
      createdAt: { $gte: startOfToday },
    });
    const todayDepositEntry = await Transaction.find({
      $or: [
        {
          $and: [
            { createdAt: { $gte: startOfToday } },
            { status: 'SUCCESS' },
            { Req_type: 'deposit' },
          ],
        },
        {
          $and: [
            { createdAt: { $gte: startOfToday } },
            { status: 'PAID' },
            { Req_type: 'deposit' },
          ],
        },
      ],
    });
    const todayWithdrawEntry = await Transaction.find({
      $or: [
        {
          $and: [
            { createdAt: { $gte: startOfToday } },
            { status: 'SUCCESS' },
            { Req_type: 'withdraw' },
          ],
        },
        {
          $and: [
            { createdAt: { $gte: startOfToday } },
            { status: 'PAID' },
            { Req_type: 'withdraw' },
          ],
        },
      ],
    });
    totalUser.forEach((item) => {
      totolWonAmount += item.wonAmount;
      totalLoseAmount += item.loseAmount;
      totalHoldBalance += item.hold_balance;
      totalWithdrawHold += item.withdraw_holdbalance;
      totalDeposit += item.totalDeposit;
      totalWithdrawl += item.totalWithdrawl;
      totalReferralEarning += item.referral_earning;
      totalReferralWallet += item.referral_wallet;
      totalWalletbalance += item.Wallet_balance;
    });
    todayWithdrawEntry.forEach((item) => {
      todayTotalWithdraw += item.amount;
    });
    todayDepositEntry.forEach((item) => {
      todayTotalDeposit += item.amount;
    });
    todayCommissionEntry.forEach((item) => {
      todayCommission += item.Ammount;
    });
    todaySuccessGame.forEach((item) => {
      todaySuccessAmount += item.Game_Ammount;
    });
    const data = {
      totalUser: totalUser.length,
      todayUser: todayUser,
      todayAllGame: todayAllGame,
      todaySuccessGame: todaySuccessGame.length,
      todayCancelGame: todayCancelGame,
      totalGame: totalGame,
      todayCommission: todayCommission,
      todayTotalDeposit: todayTotalDeposit,
      todayTotalWithdraw: todayTotalWithdraw,
      totolWonAmount: totolWonAmount,
      totalLoseAmount: totalLoseAmount,
      totalHoldBalance: totalHoldBalance,
      totalWithdrawHold: totalWithdrawHold,
      totalDeposit: totalDeposit,
      totalWithdrawl: totalWithdrawl,
      totalReferralEarning: totalReferralEarning,
      totalReferralWallet: totalReferralWallet,
      totalWalletbalance: totalWalletbalance,
    };
    res.send(data);
  } catch (error) {
    console.log(error);
  }
});

router.get('/total/user', Auth, async (req, res) => {
  try {
    const admin = await User.find().countDocuments();

    res.status(200).send(admin.toString());
  } catch (e) {
    res.status(400).send(e);
  }
});

router.get('/get_user/:id', Auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('action_by');
    res.status(200).send(user);
  } catch (e) {
    res.status(400).send(e);
  }
});
router.get('/total/admin', Auth, RoleBase('Admin'), async (req, res) => {
  try {
    const admin = await User.find({ user_type: 'Admin' }).countDocuments();

    res.status(200).send(admin.toString());
  } catch (e) {
    res.status(400).send(e);
  }
});
router.get('/total/block', Auth, async (req, res) => {
  try {
    const admin = await User.find({ user_type: 'Block' }).countDocuments();

    res.status(200).send(admin.toString());
  } catch (e) {
    res.status(400).send(e);
  }
});

router.get('/total/active', Auth, async (req, res) => {
  try {
    const order = await User.find({
      $and: [{ Wallent_balance: { $gt: 0 } }, { user_type: 'User' }],
    }).countDocuments();

    res.status(200).send(order.toString());
  } catch (e) {
    res.status(400).send(e);
  }
});
router.get('/challange/completed', Auth, async (req, res) => {
  try {
    const admin = await Game.find({ Status: 'completed' }).countDocuments();

    res.status(200).send(admin.toString());
  } catch (e) {
    res.status(400).send(e);
  }
});
router.get('/challange/active', Auth, async (req, res) => {
  try {
    const admin = await Game.find({
      $or: [{ Status: 'running' }, { Status: 'pending' }],
    }).countDocuments();

    res.status(200).send(admin.toString());
  } catch (e) {
    res.status(400).send(e);
  }
});
router.get('/challange/running', Auth, async (req, res) => {
  try {
    const admin = await Game.find({ Status: 'requested' }).countDocuments();

    res.status(200).send(admin.toString());
  } catch (e) {
    res.status(400).send(e);
  }
});
router.get('/challange/cancelled', Auth, async (req, res) => {
  try {
    const admin = await Game.find({ Status: 'cancelled' }).countDocuments();

    res.status(200).send(admin.toString());
  } catch (e) {
    res.status(400).send(e);
  }
});
router.get('/total/deposit', Auth, async (req, res) => {
  try {
    const data = await Transaction.find({
      $and: [{ Req_type: 'deposit' }, { status: 'SUCCESS' }],
    });
    const countDeposit = await Transaction.find({
      $and: [{ Req_type: 'deposit' }],
    }).countDocuments();

    let total = 0;

    data.forEach((item) => {
      total += item.amount;
    });

    res.status(200).send({ data: total, count: countDeposit });
    // console.log(ress);
  } catch (e) {
    res.status(400).send(e);
    console.log(e);
  }
});
router.get('/count/new/deposit', Auth, async (req, res) => {
  try {
    const countDeposit = await Transaction.find({
      $and: [{ Req_type: 'deposit' }, { status: 'Pending' }],
    }).countDocuments();
    let total = parseInt(countDeposit);
    res.status(200).send({ count: total });
    // console.log(ress);
  } catch (e) {
    res.status(400).send(e);
    console.log(e);
  }
});

router.get('/admin/all', Auth, async (req, res) => {
  try {
    const admin = await User.find({ user_type: 'Admin' });

    res.status(200).send(admin);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.get('/User/all/panelty', Auth, async (req, res) => {
  const searchq = req.query._q;
  const searchtype = req.query._stype;
  const PAGE_SIZE = req.query._limit;
  let page = req.query.page == 0 ? 0 : parseInt(req.query.page - 1);
  try {
    let query = {};
    if (searchq != 0 && searchtype != 0) {
      page = parseInt('0');
      query[searchtype] =
        searchtype === 'Phone' || searchtype === '_id'
          ? searchq
          : new RegExp('.*' + searchq + '.*');
    } else {
      query = {};
    }
    const total = await User.countDocuments(query);
    const admin = await User.find(query)
      .where('user_type')
      .ne('Admin')
      .limit(PAGE_SIZE)
      .skip(PAGE_SIZE * page);

    res.status(200).send({ totalPages: Math.ceil(total / PAGE_SIZE), admin });
  } catch (e) {
    res.status(400).send(e);
  }
});

//view all user with react paginate
// router.get("/User/all", Auth, async (req, res) => {
//     const searchq = req.query._q;
//     const searchtype = req.query._stype;
//     const PAGE_SIZE = req.query._limit;
//     let page =(req.query.page==0)? 0 : parseInt(req.query.page-1);
//     try {
//         let query ={};
//         if(searchq!=0 && searchtype !=0){
//             page = parseInt("0");
//             query[searchtype] = (searchtype==='Phone' || searchtype==='_id')? searchq : new RegExp('.*' + searchq + '.*')
//         }else{
//             query = {};
//         }

//         const total = await User.countDocuments(query);
//         const admin = await User.find(query).where("user_type").ne("Admin").sort({ updatedAt: -1 }).limit(PAGE_SIZE).skip(PAGE_SIZE * page);

//         res.status(200).send({totalPages: Math.ceil(total / PAGE_SIZE), admin})

//     } catch (e) {
//         res.status(400).send(e)
//     }
// })

//view all user with react paginate
router.get('/User/all', Auth, async (req, res) => {
  const searchq = req.query._q;
  const searchtype = req.query._stype;
  const PAGE_SIZE = req.query._limit;
  const searchbystatus = req.query._status;
  const searchbyUser = req.query._Userstatus;

  let page = req.query.page == 0 ? 0 : parseInt(req.query.page - 1);
  try {
    let query = {};
    let total;
    let admin;
    if (searchq != 0 && searchtype != 0 && searchbystatus == 0) {
      page = parseInt('0');
      query[searchtype] =
        searchtype === 'Phone' ||
        searchtype === '_id' ||
        searchtype === 'createdAt'
          ? searchq
          : new RegExp('.*' + searchq + '.*');

      total = await User.countDocuments(query);
      admin = await User.find(query)
        .where('user_type')
        .ne('Admin')
        .populate('action_by')
        .sort({ updatedAt: -1 })
        .limit(PAGE_SIZE)
        .skip(PAGE_SIZE * page);
    } else if (
      searchbystatus != 0 &&
      searchbystatus != 'Block' &&
      searchbystatus != 'hold_balance' &&
      searchq == 0 &&
      searchtype == 0
    ) {
      total = await User.countDocuments({ query, verified: searchbystatus });
      admin = await User.find({ query, verified: searchbystatus })
        .where('user_type')
        .ne('Admin')
        .populate('action_by')
        .sort({ updatedAt: -1 })
        .limit(PAGE_SIZE)
        .skip(PAGE_SIZE * page);
    } else if (
      searchbystatus != 0 &&
      searchbystatus == 'Block' &&
      searchbystatus != 'hold_balance' &&
      searchq == 0 &&
      searchtype == 0
    ) {
      total = await User.countDocuments({ query, user_type: searchbystatus });
      admin = await User.find({ query, user_type: searchbystatus })
        .populate('action_by')
        .sort({ updatedAt: -1 })
        .limit(PAGE_SIZE)
        .skip(PAGE_SIZE * page);
    } else if (
      searchbystatus != 0 &&
      searchbystatus == 'hold_balance' &&
      searchq == 0 &&
      searchtype == 0
    ) {
      total = await User.countDocuments({ hold_balance: { $gt: 0 } });
      admin = await User.find({ hold_balance: { $gt: 0 } })
        .populate('action_by')
        .sort({ updatedAt: -1 })
        .limit(PAGE_SIZE)
        .skip(PAGE_SIZE * page);
    } else {
      total = await User.countDocuments(query);
      admin = await User.find(query)
        .where('user_type')
        .ne('Admin')
        .populate('action_by')
        .sort({ updatedAt: -1 })
        .limit(PAGE_SIZE)
        .skip(PAGE_SIZE * page);
    }

    res.status(200).send({ totalPages: Math.ceil(total / PAGE_SIZE), admin });
  } catch (e) {
    res.status(400).send(e);
  }
});

router.get('/count/rejected/deposit', Auth, async (req, res) => {
  try {
    const countDeposit = await Transaction.find({
      $and: [{ Req_type: 'deposit' }, { status: 'FAILED' }],
    }).countDocuments();
    let total = parseInt(countDeposit);
    res.status(200).send({ count: total });
    // console.log(ress);
  } catch (e) {
    res.status(400).send(e);
    console.log(e);
  }
});
router.get('/total/withdraw', Auth, async (req, res) => {
  try {
    const data = await Transaction.find({
      $and: [{ Req_type: 'withdraw' }, { status: 'SUCCESS' }],
    });
    const countTotal = await Transaction.find({
      $and: [{ Req_type: 'withdraw' }],
    }).countDocuments();
    let total = 0;
    data.forEach((item) => {
      total += item.amount;
    });
    res.status(200).send({ data: total, count: countTotal });
    // console.log(ress);
  } catch (e) {
    res.status(400).send(e);
    console.log(e);
  }
});

router.get('/count/new/withdrawl', Auth, async (req, res) => {
  try {
    const countDeposit = await Transaction.find({
      $and: [{ Req_type: 'withdraw' }, { status: 'Pending' }],
    }).countDocuments();
    let total = parseInt(countDeposit);
    res.status(200).send({ count: total });
    // console.log(ress);
  } catch (e) {
    res.status(400).send(e);
    console.log(e);
  }
});

router.get('/count/rejected/withdrawl', Auth, async (req, res) => {
  try {
    const countDeposit = await Transaction.find({
      $and: [{ Req_type: 'withdraw' }, { status: 'reject' }],
    }).countDocuments();
    let total = parseInt(countDeposit);
    res.status(200).send({ count: total });
    // console.log(ress);
  } catch (e) {
    res.status(400).send(e);
    console.log(e);
  }
});

router.patch(
  '/admin/edit/user/:id',
  Auth,
  RoleBase('Admin'),
  async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      res.send(user);
    } catch (error) {
      res.status(400).send(error);
    }
  }
);
// router.patch('/user/edit', Auth, async (req, res) => {
//     try {
//         if (req.body.referral) {
//             const Exist = await User.find({ referral_code: req.body.referral });
//             if (Exist.length == 1) {
//                 const order = await User.findByIdAndUpdate(req.user._id, req.body, { new: true })
//                 res.status(200).send({ msg: 'Referral submited successfully', submit: true })
//             }
//             else {
//                 res.status(200).send({ msg: 'Invalid referral Code', submit: false });
//             }
//         }
//         else if(req.body.bankDetails){
//             try {
//                 const user = await User.findByIdAndUpdate(req.user._id, req.body, { new: true })
//                 // beneficiery crud operation
//                 const config = {
//                     Payouts:{
//                   ClientID: "CF217991CB3DEFUD94MM84223P3G",
//                   ClientSecret: "4fdeb33d0a4cecc3ad2975e83fe026f8377d487e",
//                   ENV: "PRODUCTION",
//                     }
//                 };

//                 const cfSdk = require('cashfree-sdk');
//                 const {Payouts} = cfSdk;
//                 const {Beneficiary} = Payouts;
//                 const handleResponse = (response) => {
//                     if(response.status === "ERROR"){
//                         throw {name: "handle response error", message: "error returned"};
//                     }
//                 }
//                 const bene = {
//                     "beneId": user._id,
//                     "name": user.Name,
//                     "email": "demo@gmail.com",
//                     "phone": user.Phone,
//                     "bankAccount": user.account_number,
//                     "ifsc": user.ifsc_code,
//                     "address1" : "ABC Street",
//                     "city": "Bangalore",
//                     "state":"Karnataka",
//                     "pincode": "560001",
//                     "vpa":user.upi_id
//                 };
//                     Payouts.Init(config.Payouts);
//                     const response = await Beneficiary.GetDetails({
//                         "beneId": bene.beneId,
//                     });
//                     if(response.status === 'ERROR' && response.subCode === '404' && response.message === 'Beneficiary does not exist'){
//                             const response1 = await Beneficiary.Add(bene);
//                             res.status(200).send(response1);
//                             handleResponse(response1);
//                     }
//                     else{
//                             const response = await Beneficiary.Remove({"beneId": bene.beneId});
//                             handleResponse(response);
//                             const response1 = await Beneficiary.Add(bene);
//                             res.status(200).send(response1);
//                             handleResponse(response1);
//                     }
//             }
//             catch(e) {
//                 // console.log(e)
//                 res.status(200).send({ msg: 'something went wrong', submit: false });
//             }
//         }
//         else {
//             if(req.body.Name)
//             {
//                 const user=await User.findOne({Name:req.body.Name});
//                 if(user)
//                 {
//                     return res.send("User name already exist!");
//                 }
//                 else{
//                     const order = await User.findByIdAndUpdate(req.user._id ,req.body, { new: true })
//                     res.status(200).send(order)
//                 }
//             }
//             else{
//                 const order = await User.findByIdAndUpdate(req.user._id ,req.body, { new: true })
//                 res.status(200).send(order)
//             }
//         }
//     } catch (e) {
//         console.log(e)
//     }
// })
router.patch('/user/edit', Auth, async (req, res) => {
  try {
    if (req.body.referral) {
      const Exist = await User.find({ referral_code: req.body.referral });
      if (Exist.length == 1) {
        const order = await User.findByIdAndUpdate(req.user._id, req.body, {
          new: true,
        });
        res
          .status(200)
          .send({ msg: 'Referral submited successfully', submit: true });
      } else {
        res.status(200).send({ msg: 'Invalid referral Code', submit: false });
      }
    } else if (req.body.bankDetails) {
      try {
        const user = await User.findByIdAndUpdate(req.user._id, req.body, {
          new: true,
        });
        // beneficiery crud operation
        /* const config = {
                    Payouts: {
                        ClientID: "CF217991CB3DEFUD94MM84223P3G",
                        ClientSecret: "4fdeb33d0a4cecc3ad2975e83fe026f8377d487e",
                        //   pathToPublicKey: '/public/accountId_15720_public_key.pem',
                        // publicKey: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoZh3aD0zIHBm24h9Q0SWSCko3pHbYjxBbg/8YEXN7n0UVh7zKl3mzV+FeeEW9tQNtMFtnmiPGsRG6Z6lgycchisECtQVMx8E9oAyxcUEa/qK1IDLK6cZIh47IIZw2g7iCrO+bnZITKXUigTbYWLcM0I2y3DsoHRA3kBBg/oAeC/35evTHh59sEVVn+hxWoS330NhgQuupiFqfnu3d+UUTzm3CBcr9znhFNh6RWz3T2XyKL3/u7qJXr0xTLpwlJ9aHi3XA4xJg8Fr5D3S6ZZQJxoiQuh/3UlAn3kGEbmSq0jGnkHEznkwvYKX3r+aAvGEaezCUrBov3+I1UzNxmD7bQIDAQAB",
                        ENV: "PRODUCTION",
                    }
                };

                const cfSdk = require('cashfree-sdk');
                const { Payouts } = cfSdk;
                const { Beneficiary } = Payouts;
                const handleResponse = (response) => {
                    if (response.status === "ERROR") {
                        throw { name: "handle response error", message: "error returned" };
                    }
                }
                const bene = {
                    "beneId": user._id,
                    "name": user.Name,
                    "email": "demo@gmail.com",
                    "phone": user.Phone,
                    "bankAccount": user.account_number,
                    "ifsc": user.ifsc_code,
                    "address1": "ABC Street",
                    "city": "Bangalore",
                    "state": "Karnataka",
                    "pincode": "560001",
                    "vpa": user.upi_id
                };
                //Get Beneficiary details
                Payouts.Init(config.Payouts);
                const response = await Beneficiary.GetDetails({
                    "beneId": bene.beneId,
                });
                if (response.status === 'ERROR' && response.subCode === '404' && response.message === 'Beneficiary does not exist') {
                    console.log('add new benn');
                    const response1 = await Beneficiary.Add(bene);
                    console.log("beneficiarry addition response", response1);
                    res.status(200).send(response1);
                    handleResponse(response1);
                }
                else {
                    const response = await Beneficiary.Remove({ "beneId": bene.beneId });
                    handleResponse(response);
                    const response1 = await Beneficiary.Add(bene);
                    console.log("beneficiarry addition response");
                    res.status(200).send(response1);
                    handleResponse(response1);
                } */
        res.status(200).send({
          msg: 'Details updated successfully',
          subCode: '200',
          submit: true,
        });
      } catch (e) {
        console.log(e);
        res.status(200).send({ msg: 'something went wrong', submit: false });
      }
    } else {
      if (req.body.Name) {
        var message = req.body.Name.trim();
        var cleaned = profanity.maskBadWords(message.toString());
        req.body.Name = cleaned;

        const user = await User.findOne({ Name: req.body.Name });
        if (user) {
          return res.send('User name already exist!');
        } else {
          const updates = Object.keys(req.body);
          const allowupdates = [
            'Name',
            'Password',
            'avatar',
            'Phone',
            'Email',
            'Referred_By',
            'referral_code',
            'referral',
          ];

          const isValidUpdate = updates.every((update) => {
            allowupdates.includes(update);
          });

          if (isValidUpdate) {
            return res.send('Invalid Update');
          }
          const user = await User.findById(req.user._id);
          updates.forEach((update) => {
            user[update] = req.body[update];
          });

          await user.save();
          res.status(200).send(user);
        }
      } else {
        const updates = Object.keys(req.body);
        const allowupdates = [
          'Name',
          'Password',
          'avatar',
          'Phone',
          'Email',
          'Referred_By',
          'referral_code',
          'referral',
        ];

        const isValidUpdate = updates.every((update) => {
          allowupdates.includes(update);
        });

        if (!isValidUpdate) {
          return res.send('Invalid Update');
        }
        const user = await User.findById(req.user._id);
        updates.forEach((update) => {
          user[update] = req.body[update];
        });

        await user.save();
        res.status(200).send(user);
      }
    }
  } catch (e) {
    console.log(e);
    // res.status(400).send(e)
  }
});

//logout
router.post('/logout', Auth, async (req, res) => {
  try {
    req.user.tokens = [];
    await req.user.save();

    res.send();
  } catch (e) {
    res.status(500).send();
  }
});

router.post('/logoutAll', Auth, async (req, res) => {
  try {
    req.user.tokens = [];
    await req.user.save();
    res.send('logout');
  } catch (e) {
    res.status(500).send(e);
  }
});

router.post('/logoutAllUsers', async (req, res) => {
  try {
    //req.user.tokens = []
    //verified: 'unverified',
    const updateDoc = {
      $set: {
        avatar: '',
      },
    };
    await User.updateMany(updateDoc);
    res.send('logout');
  } catch (e) {
    res.status(500).send(e);
  }
});

router.post('/referral/to/wallet', Auth, async (req, res) => {
  try {
    const amount = req.body.amount;
    const user = await User.findById(req.user.id);
    const txn = new Transaction();
    if (amount <= user.referral_wallet) {
      user.Wallet_balance += amount;
      user.withdrawAmount += amount;
      user.referral_wallet -= amount;

      txn.amount = amount;
      txn.User_id = user._id;
      txn.Req_type = 'deposit';
      txn.Withdraw_type = 'referral';
      txn.payment_gatway = 'referral_wallet';
      txn.status = 'PAID';
      txn.txn_msg = 'Referral wallet Reedem Succesfully';
      txn.closing_balance = user.Wallet_balance;

      txn.save();
      user.save();
      res.send({ msg: 'success' });
    } else {
      res.send({ msg: 'Invalid Amount' });
    }
  } catch (e) {
    res.status(500).send(e);
  }
});

//update password
router.post('/changepassword', Auth, (req, res) => {
  const { Password, newPassword, confirmNewPassword } = req.body;
  const userID = req.user.id;

  if (!Password || !newPassword || !confirmNewPassword) {
    res.send({ msg: 'Please fill in all fields.' });
  }
  //Check passwords match

  if (newPassword !== confirmNewPassword) {
    res.send({ msg: 'New passwords do not match.' });
  } else {
    User.findOne({ _id: userID }).then((user) => {
      bcrypt.compare(Password, user.Password, (err, isMatch) => {
        if (err) throw err;
        if (isMatch) {
          bcrypt.hash(newPassword, 10, (err, hash) => {
            if (err) throw err;
            user.Password = hash;
            user.save();
          });
          res.status(200).send({ status: 'true', massage: 'password chnage' });
        } else {
          res.send({ msg: 'Current password is not a match.' });
        }
      });
    });
  }
});

router.get('/me', Auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.send(user);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.post('/login/admin', async (req, res) => {
  const phone = req.body.Phone;
  const SecretCode = twofactor.generateSecret({ Phone: phone });
  const newSecret = twofactor.generateToken(SecretCode.secret);
  console.log(newSecret.token);

  try {
    let user = await User.findOne({ Phone: phone, user_type: 'Admin' });

    if (!user) {
      user = await User.findOne({ Phone: phone, user_type: 'Agent' });
    }
    let otpmobile = '9571764041';
    user.otp = newSecret.token;
    user.save();

    // https.get(
    //   `https://www.fast2sms.com/dev/bulkV2?authorization=DZi9YlavXpnbjaxkvvFGy1UatpdNcdhOF6uHbOjt0ozezFIJgwji0IfxeUME4&route=dlt&sender_id=WPISMS&message=148262&variables_values=${newSecret.token}%7C&flash=0&numbers=${otpmobile}`,
    //   (resp) => {
    //     console.log('send');
    //   }
    // );

    https.get(
      `https://www.fast2sms.com/dev/bulkV2?authorization=kvASD0KaEZYte14xLuQJ7rV25dmgp3MqHF6woCzfRsUXTP98lO2yfN5JXWzx1O3SKsqHmVPguidGZYcb&route=dlt&sender_id=JPLUDO&message=157995&variables_values=${newSecret.token}%7C&flash=0&numbers=${otpmobile}`,
      (resp) => {
        console.log('send');
      }
    );

    return res.json({
      status: 200, // Custom Status for Inbuild Use Says That 2fa Authentication is required
      msg: 'Authentication Required',
      secret: SecretCode.secret,
    });
  } catch (err) {
    console.error(err);
    res.status(401).send('Invalid Details');
  }
});

router.post('/login/admin/finish', async (req, res) => {
  console.log('finish call ghaov (Admin) 👍');
  const { Phone, twofactor_code, secretCode } = req.body;
  console.log('secredt key', secretCode);
  try {
    let user = await User.findOne({ Phone: Phone, user_type: 'Admin' });
    if (!user) {
      user = await User.findOne({ Phone: Phone, user_type: 'Agent' });
    }
    if (user != null) {
      if (user.otp != twofactor_code) {
        console.log('Invalid Two Factor Code');
        return res.send({ msg: 'Invalid OTP', status: 101 });
      } else {
        const matched = twofactor.verifyToken(secretCode, twofactor_code);
        if (matched == null) {
          return res.json({ status: 101, msg: 'Invalid OTP!' });
        } else {
          console.log('match3d resuldt', matched.delta);

          //if(matched.delta==0){
          const token = await user.genAuthToken();
          res.status(200).send({
            status: 200,
            msg: 'login successful',
            token,
            user,
          });
        }
      }
    }
  } catch (e) {
    res.status(400).send(e);
    console.log(e);
  }
});

// router.post("/login/admin", async (req, res) => {
//     const email = req.body.Email;
//     const phone = req.body.Phone;
//     const password = req.body.Password;
//     try {
//         let user = await User.findOne({ Phone: phone, user_type: "Admin" });

//     if (!user) {
//       user = await User.findOne({ Phone: phone, user_type: "Agent" });
//     }

//         const isMatch = await bcrypt.compare(password, user.Password);
//         if (!isMatch) {
//             return res.status(400).json({
//                 errors: [{ msg: "Invalid Credentials" }],
//             });
//         }
//         const token = await user.genAuthToken();
//         res.status(200).send({
//             status: "true",
//             msg: "login successful",
//             data: [token, user],
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(401).send("Invalid Details");
//     }
// });

router.get('/referral/code/:id', Auth, async (req, res) => {
  try {
    const data = await User.find({ referral: req.params.id }).countDocuments();
    res.send(data.toString());
  } catch (e) {
    res.send(e);
  }
});

router.post('/user/bonus/:id', Auth, async (req, res) => {
  try {
    const data = await User.findById(req.params.id);

    data.Wallet_balance += req.body.bonus;
    //data.withdrawAmount += req.body.bonus;
    data.totalBonus += req.body.bonus;

    data.save();

    const txn = new Transaction();
    txn.amount = req.body.bonus;
    txn.User_id = req.params.id;
    txn.Req_type = 'bonus';
    txn.action_by = req.user._id; //Added By team
    txn.closing_balance = data.Wallet_balance;
    txn.status = 'Bonus by Admin';
    txn.save();

    //console.log('bonusadded: ',txn);
    const order = await User.findByIdAndUpdate(
      req.params.id,
      { bonus: req.body.bonus },
      { new: true }
    );
    res.status(200).send(order);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.patch('/user/missmatch/clear/:id', async (req, res) => {
  try {
    const userData = await User.findById(req.params.id);

    const mismatchValue =
      userData.Wallet_balance -
      (userData.wonAmount -
        userData.loseAmount +
        userData.totalDeposit +
        userData.referral_earning +
        userData.totalBonus -
        (userData.totalWithdrawl +
          userData.referral_wallet +
          userData.withdraw_holdbalance +
          userData.hold_balance +
          userData.totalPenalty));
    if (mismatchValue < 0) {
      userData.Wallet_balance = userData.Wallet_balance - mismatchValue;
    } else if (mismatchValue > 0 && userData.Wallet_balance >= mismatchValue) {
      userData.Wallet_balance = userData.Wallet_balance - mismatchValue;
    }
    userData.save();
    console.log(userData);

    res.status(200).send('Button was clicked');
  } catch (e) {
    res.status(400).send(e);
  }
});

router.patch('/user/Hold/clear/:id', async (req, res) => {
  try {
    const userData = await User.findById(req.params.id);

    let prevGame = await Game.find({
      $or: [
        {
          $and: [
            { Status: 'conflict' },
            { Created_by: req.params.id },
            { Creator_Status: null },
          ],
        },
        {
          $and: [
            { Status: 'conflict' },
            { Accepetd_By: req.params.id },
            { Acceptor_status: null },
          ],
        },
      ],
    });

    if (prevGame.length == 0) {
      prevGame = await Game.find({
        $or: [
          {
            $and: [
              { Status: 'pending' },
              { Created_by: req.params.id },
              { Creator_Status: null },
            ],
          },
          {
            $and: [
              { Status: 'pending' },
              { Accepetd_By: req.params.id },
              { Acceptor_status: null },
            ],
          },
        ],
      });
    }
    if (prevGame.length == 0) {
      prevGame = await Game.find({
        $or: [
          { $and: [{ Status: 'running' }, { Created_by: req.params.id }] },
          { $and: [{ Status: 'running' }, { Accepetd_By: req.params.id }] },
        ],
      });
    }
    if (prevGame.length == 0) {
      prevGame = await Game.find({
        $or: [
          { $and: [{ Status: 'new' }, { Created_by: req.params.id }] },
          { $and: [{ Status: 'new' }, { Accepetd_By: req.params.id }] },
        ],
      });
    }
    //console.log('hold reove check',prevGame);
    if (prevGame.length == 0 && userData.hold_balance > 0) {
      userData.Wallet_balance = userData.Wallet_balance + userData.hold_balance;
      userData.hold_balance = 0;

      userData.save();
      res.status(200).send('hold Button was clicked');
    } else {
      res.status(200).send('Check enrolled games');
    }

    // console.log(userData);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.post('/user/penlaty/:id', Auth, async (req, res) => {
  try {
    const data = await User.findById(req.params.id);
    if (req.body.bonus <= data.Wallet_balance) {
      data.Wallet_balance -= req.body.bonus;
      data.withdrawAmount -= req.body.bonus;
      data.totalPenalty += req.body.bonus;

      if (data.withdrawAmount < 0) {
        data.withdrawAmount = 0;
      }
      const txn = new Transaction();
      txn.amount = req.body.bonus;
      txn.User_id = req.params.id;
      txn.Req_type = 'penalty';
      txn.action_by = req.user._id; //Added By team
      // txn.Withdraw_type = req.body.type;
      txn.closing_balance = data.Wallet_balance;
      txn.status = 'Penalty by Admin';
      txn.save();

      data.save();
      const transac = new myTransaction({
        User_id: req.params.id,
        Amount: req.body.bonus,
        Remark: 'Penalty by Admin',
      });
      await transac.save();
      res.status(200).send(data);
    } else {
      res.status(200).send({ status: 0 });
    }
  } catch (e) {
    res.status(400).send(e);
  }
});

router.post('/block/user/:id', Auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.user_type = req.body.user_type;
    user.action_by = req.user._id; //Added By team
    user.tokens = [];
    user.save();

    res.send('user block');
  } catch (e) {
    res.status(500).send();
  }
});

router.get('/website/setting', async (req, res) => {
  const paymentGateway = await GatewaySettings.findOne();

  //console.log('gatway RazorPayKey',paymentGateway.RazorPayKey);
  //console.log('gatway RazorPaySecretKey',paymentGateway.RazorPaySecretKey);
  //console.log('gatway AccountName',paymentGateway.AccountName);
  const webSetting = {
    isCashFreeActive: false,
    isPhonePeActive: true,
    isRazorPayActive: false,
    isDecentroActive: false,
    isManualPaymentActive: false,
    isManualUPIQR: '', //paymentGateway.QRcode,
    isUpiGatewayActive: true,

    isManualPayoutActive: true,
    isCashFreePayoutActive: false,
    // isRazorPayPayoutActive: paymentGateway.RazorPayout,
    isRazorPayPayoutActive: null,
    // isDecentroPayoutActive: paymentGateway.decentroPayout,
    isDecentroPayoutActive: null,
    maxAutopayAmt: 1500,

    RazorPayKey: 'rzp_test_TF4g8dFj5CY16x',
    RazorPaySecretKey: 'ZiQZdaTqC6G0mOGkUfe927n9',
    // AccountName: paymentGateway.AccountName,

    // isDecentroPayoutAuto: paymentGateway.decentroAuto,
    // isRazorPayPayoutAuto: paymentGateway.RazorpayAuto,
    AccountName: null,

    isDecentroPayoutAuto: null,
    isRazorPayPayoutAuto: null,
  };
  //console.log('webSetting ',webSetting);
  res.send(webSetting);
});

module.exports = router;
