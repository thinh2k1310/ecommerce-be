const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');


// Bring in models and helpers
const User = require('../../models/user')
const mailgun = require('../../config/mailgun');
const template = require('../../config/template');


const key = process.env.JWT_SECRET;

function login(req, res){
    const email = req.body.email;
    const password = req.body.password;
  
    User.findOne({ email }).then(user => {
      if (!user) {
        return res
          .status(422)
          .send({ error: 'No user found for this email address.' });
      }
      bcrypt.compare(password, user.password).then(isMatch => {
        if (isMatch) {
          const payload = { id: user.id };
          jwt.sign(payload, key, { expiresIn: 3600 }, (err, token) => {
            res.status(200).json({
              success: true,
              token: `Bearer ${token}`,
              user: {
                id: user.id,
                firstName: user.profile.firstName,
                lastName: user.profile.lastName,
                email: user.email,
                role: user.role
              }
            });
          });
        } else {
          res.status(404).json({
            success: false,
            error: 'Password is incorrect'
          });
        }
      });
    });
  }

  function register(req,res,next){
    const email = req.body.email;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const password = req.body.password;
  
    if (!email) {
      return res.status(422).json({ error: 'You must enter an email address.' });
    }
  
    if (!firstName || !lastName) {
      return res.status(422).json({ error: 'You must enter your full name.' });
    }
  
    if (!password) {
      return res.status(422).json({ error: 'You must enter a password.' });
    }
  
    User.findOne({ email }, (err, existingUser) => {
      if (err) {
        return next(err);
      }
  
      if (existingUser) {
        return res
          .status(422)
          .json({ error: 'This email address is already in use.' });
      }
  
      const user = new User({
        email,
        password,
        profile: { firstName, lastName }
      });
  
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(user.password, salt, (err, hash) => {
          if (err) {
            console.log(err);
          }
          user.password = hash;
  
          user.save((err, user) => {
            if (err) {
              return next(err);
            }
  
            const payload = { id: user.id };
  
            jwt.sign(payload, key, { expiresIn: 3600 }, (err, token) => {
              res.status(200).json({
                success: true,
                token: `Bearer ${token}`,
                user: {
                  id: user.id,
                  firstName: user.profile.firstName,
                  lastName: user.profile.lastName,
                  email: user.email,
                  role: user.role
                }
              });
            });
          });
        });
      });
    });
  }

function forgotPassword(req, res, next){
    const email = req.body.email;
  
    User.findOne({ email }, (err, existingUser) => {
      if (err || existingUser == null) {
        res.status(422).json({
          error:
            'Your request could not be processed as entered. Please try again.'
        });
        return next(err);
      }
  
      crypto.randomBytes(48, (err, buffer) => {
        const resetToken = buffer.toString('hex');
        if (err) {
          return next(err);
        }
  
        existingUser.resetPasswordToken = resetToken;
        existingUser.resetPasswordExpires = Date.now() + 3600000;
  
        existingUser.save(err => {
          if (err) {
            return next(err);
          }
          
          const message = template.resetEmail(req, existingUser.profile.firstName, resetToken);
  
          mailgun.sendEmail(existingUser.email, message);
  
          return res.status(200).json({
            message:
              'Please check your email for the link to reset your password.'
          });
        });
      });
    });
  }
  
function resetPasswordWithToken(req, res, next){
    User.findOne(
      {
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
      },
      (err, resetUser) => {
        if (!resetUser) {
          return res.status(422).json({
            error:
              'Your token has expired. Please attempt to reset your password again.'
          });
        }
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(req.body.password, salt, (err, hash) => {
            if (err) {
              console.log(err);
            }
            req.body.password = hash;
  
            resetUser.password = req.body.password;
            resetUser.resetPasswordToken = undefined;
            resetUser.resetPasswordExpires = undefined;
  
            resetUser.save(err => {
              if (err) {
                return next(err);
              }
  
              const message = template.confirmResetPasswordEmail();
              mailgun.sendEmail(resetUser.email, message);
  
              return res.status(200).json({
                message:
                  'Password changed successfully. Please login with your new password.'
              });
            });
          });
        });
      }
    );
  }

function changePassword(req, res, next){
    const email = req.body.email;
  
    User.findOne({ email }, (err, existingUser) => {
      if (err || existingUser == null) {
        res.status(422).json({
          error:
            'Your request could not be processed as entered. Please try again.'
        });
        return next(err);
      }
  
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(req.body.password, salt, (err, hash) => {
          if (err) {
            console.log(err);
          }
          req.body.password = hash;
  
          existingUser.password = req.body.password;
  
          existingUser.save(err => {
            if (err) {
              return next(err);
            }
  
            const message = template.confirmResetPasswordEmail();
            mailgun.sendEmail(existingUser.email, message);
  
            return res.status(200).json({
              success: true,
              message:
                'Password changed successfully. Please login with your new password.'
            });
          });
        });
      });
    });
  }
function getProfileById(req, res){
    const profile = req.body.profile;
    let query = { _id: req.params.userId };
  
    User.updateOne(query, { profile: profile }, (err, user) => {
      res.status(200).json({
        success: 'updated',
        user: user
      });
    });
  }

module.exports = {
      login,
      register,
      forgotPassword,
      resetPasswordWithToken,
      changePassword,
      getProfileById
  }
