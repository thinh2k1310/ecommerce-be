const mailgun = require('mailgun-js')({
    apiKey: process.env.MAILGUN_KEY,
    domain: process.env.MAILGUN_DOMAIN
  });
  
  function sendEmail(recipient, message){
    const data = {
      from: 'Ecommerce store <ecommerce-store@gmail.com>',
      to: recipient,
      subject: message.subject,
      text: message.text
    };
  
    mailgun.messages().send(data, (error, body) => {
      //console.log(body);
    });
  };
  
  function contactForm(sender, message){
    const data = {
      from: sender,
      to: 'you@yourdomain.com',
      subject: message.subject,
      text: message.text
    };
  
    mailgun.messages().send(data, (error, body) => {
      //console.log(body);
    });
  };

  module.exports = {
      sendEmail,
      contactForm,
  }