const nodemailer = require('nodemailer');
const path = require('path');

function sendMail(emailAddress, generatedPassword) {
    // const transporter = nodemailer.createTransport({
    //     service: 'gmail',
    //     auth: {
    //         // type: 'OAuth2',
    //         // clientId: '99712186577-bdvihp26tcgjasvmulf6phnhlskni9jm.apps.googleusercontent.com',
    //         // clientSecret: 'Y2Sax0sI_vbHytujYzjMT0dH',
    //         user: 'akmaksa65@gmail.com',
    //         password: 'AsDf1234@!'
    //     }
    // });

    // const mailOptions = {
    //     from: 'akmaksa65@gmail.com',
    //     to: emailAddress,
    //     subject: 'Сброс пароля в сервисе ZEER',
    //     html: fs.createReadStream(path.resolve(__dirname, '../ui/src/resetPassword.html'))
    // }

    // transporter.sendMail(mailOptions, function(error, info) {
    //     error ? console.log(error) : console.log(info);
    // });
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'hiomimipad@gmail.com',
            pass: 'dov57erep135'
        }
    });

    const mailOptions = {
        from: 'hiomimipad@gmail.com',
        to: emailAddress,
        subject: 'Сброс пароля в zeer.im',
        html: `
            <label>Сгенерированный пароль: ${generatedPassword}</label>
            <a
                href="https://zeer-marketplace-ui-macsik121.herokuapp.com"
            >
                Зайти в аккаунт с сгенерированным паролем
            </a>
        `
    };

    transporter.sendMail(mailOptions, function(err, info) {
        if (err) {
            console.log(err);
        } else {
            console.log('Email sent:' + info.response);
        }
    });
}

module.exports = { sendMail };
