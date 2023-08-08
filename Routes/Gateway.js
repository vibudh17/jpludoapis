const express=require("express");
const GatewaySettings=require("../Model/Gateway");
const router = express.Router()
const mongoose=require("mongoose");
const multer = require("multer")
const path = require("path");
const { findById, findOne } = require("../Model/settings");
const { send } = require("process");


router.post("/gatewaysettings",async(req, res) => {
    try{
    if(req.body.settingId){
        const updatesetting = await GatewaySettings.findById(req.body.settingId);
        updatesetting.RazorPayout=req.body.RazorPayout
        updatesetting.RazorDeposit=req.body.RazorDeposit
        updatesetting.RazorpayAuto= req.body.RazorpayAuto
        updatesetting.decentroPayout= req.body.decentroPayout
        updatesetting.decentroDeposit= req.body.decentroDeposit
        updatesetting.decentroAuto= req.body.decentroAuto
        updatesetting.RazorPayKey= req.body.RazorPayKey
        updatesetting.RazorPaySecretKey= req.body.RazorPaySecretKey
        updatesetting.AccountName= req.body.AccountName

        updatesetting.save();
        res.send({status:'success', data:updatesetting});
    }
    else{
        const data = new GatewaySettings({
            RazorPayout:req.body.RazorPayout,
            RazorDeposit:req.body.RazorDeposit,
            RazorpayAuto: req.body.RazorpayAuto,
            decentroPayout: req.body.decentroPayout,
            decentroDeposit: req.body.decentroDeposit,
            decentroAuto: req.body.decentroAuto,
            RazorPayKey: req.body.RazorPayKey,
            RazorPaySecretKey: req.body.RazorPaySecretKey,
            AccountName: req.body.AccountName
        });
        
        const val= await data.save();
        res.send({status:'success', data:val});
    }} catch (err) {
        res.send(err);
        res.send({status:'failed', data:err});
    }   
})


router.get('/gatewaysettings/data', async (req, res) => {
    try {
        const data = await GatewaySettings.findOne()
        res.send(data)
    } catch (e) {
        res.status(404).send()
    }
})


module.exports =router;