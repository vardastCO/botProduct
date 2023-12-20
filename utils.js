function convertPersianToEnglish(persianNumber) {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
    // Use regular expression to replace Persian digits with English digits
    const englishNumber = persianNumber.replace(/[۰-۹]/g, function (match) {
      return persianDigits.indexOf(match).toString();
    });
  
    return englishNumber;
  }

module.exports = {
    convertPersianToEnglish
}