const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
const envLocalPath = path.join(process.cwd(), '.env.local');

// Read the current .env file
const updateEnv = (filePath) => {
  if (fs.existsSync(filePath)) {
    console.log(`Updating ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update SMTP settings if needed
    if (!content.includes('SMTP_HOST=')) {
      content += '\nSMTP_HOST=mail.spacemail.com\n';
    } else {
      content = content.replace(
        /SMTP_HOST=.*/g, 
        'SMTP_HOST=mail.spacemail.com'
      );
    }
    
    // Update email credentials
    if (!content.includes('EMAIL_USER=')) {
      content += '\nEMAIL_USER=hello@austratics.com\n';
    } else {
      content = content.replace(
        /EMAIL_USER=.*/g, 
        'EMAIL_USER=hello@austratics.com'
      );
    }
    
    // Make sure password is set
    if (content.includes('EMAIL_PASSWORD=') && !content.includes('EMAIL_PASSWORD=Austratics@2025')) {
      content = content.replace(
        /EMAIL_PASSWORD=.*/g, 
        'EMAIL_PASSWORD=Austratics@2025'
      );
    }

    // Add support email if it doesn't exist
    if (!content.includes('SUPPORT_EMAIL=')) {
      content += '\nSUPPORT_EMAIL=hello@austratics.com\n';
    } else {
      content = content.replace(
        /SUPPORT_EMAIL=.*/g, 
        'SUPPORT_EMAIL=hello@austratics.com'
      );
    }

    // Add FROM_EMAIL if it doesn't exist
    if (!content.includes('FROM_EMAIL=')) {
      content += '\nFROM_EMAIL=hello@austratics.com\n';
    } else {
      content = content.replace(
        /FROM_EMAIL=.*/g, 
        'FROM_EMAIL=hello@austratics.com'
      );
    }
    
    // Save the updated content back to the file
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${filePath} successfully!`);
  } else {
    console.log(`❌ ${filePath} doesn't exist, skipping.`);
  }
};

// Update both .env and .env.local if they exist
updateEnv(envPath);
updateEnv(envLocalPath);

console.log('\nEmail configuration has been updated to use:');
console.log('- SMTP_HOST: mail.spacemail.com');
console.log('- EMAIL_USER: hello@austratics.com');
console.log('- SUPPORT_EMAIL: hello@austratics.com');
console.log('- FROM_EMAIL: hello@austratics.com');
console.log('\nRestart the server for changes to take effect.'); 