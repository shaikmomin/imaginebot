const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Bot configuration
const ALLOWED_CHANNEL_ID = process.env.ALLOWED_CHANNEL_ID; // Only works in this channel
const BOT_TOKEN = process.env.DISCORD_TOKEN; // Get Discord bot token from .env file
const API_KEY = process.env.API_KEY; // Get Google AI API key from .env file
const PROXY_URL = process.env.PROXY_URL; // Get Proxy URL from .env file

// Create client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// When bot is ready
client.once('ready', () => {
    console.log(`Discord Bot initialized successfully: ${client.user.tag}`);
    console.log(`Bot configured for restricted channel access: ${ALLOWED_CHANNEL_ID}`);
    console.log(`AI services ready: Imagen 3.0 and Veo 3.0 text-to-video generation`);
});

// Message event
client.on('messageCreate', async (message) => {
    // Ignore bot's own messages
    if (message.author.bot) return;

    // Only work in specified channel
    if (message.channel.id !== ALLOWED_CHANNEL_ID) {
        return; // Don't respond in other channels
    }

    // Prefix check
    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        switch (command) {
            case 'imagen':
                await handleImagen(message, args);
                break;

            case 'veo':
                await handleVeo(message, args);
                break;
        }
    } catch (error) {
        console.error('Command execution error:', error.message || error);
        await message.reply('❌ **Service Error**\nAn unexpected error occurred while processing your request. Please try again in a moment.');
    }
});

// Imagen image generation command
async function handleImagen(message, args) {
    if (args.length === 0) {
        await message.reply('❌ **Invalid Command Usage**\nPlease provide a description for image generation.\n\n**Correct usage:** `!imagen <your image description>`');
        return;
    }

    const prompt = args.join(' ');

    const loadingMsg = await message.reply('🎨 **Imagen Processing**\nGenerating high-quality image based on your description.');

    try {
        // Create parameters object
        const parameters = {
            sampleCount: 1,
            aspectRatio: "1:1",
            personGeneration: "allow_all", // Allow person generation (allow_all, allow_adult, deny_all)
            safetySetting: "block_few", // Moderate filtering (block_few, block_some, block_most)
            includeRaiReason: true, // Show filtering reasons
            addWatermark: false,
            enhancePrompt: false,
            language: "auto"
        };

        const response = await axios.post(
            `${PROXY_URL}/v1/projects/any-project-id/locations/any-location/publishers/google/models/imagen-3.0-generate-002:predict`,
            {
                instances: [{ prompt: prompt }],
                parameters: parameters
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': API_KEY
                }
            }
        );

        if (response.data.predictions && response.data.predictions.length > 0) {
            // tmp folder check and create
            const tmpDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }

            const files = [];
            const timestamp = Date.now();

            for (let i = 0; i < response.data.predictions.length; i++) {
                const prediction = response.data.predictions[i];

                if (prediction.bytesBase64Encoded) {
                    const filename = path.join(tmpDir, `imagen-${timestamp}-${i + 1}.png`);

                    // Create file from Base64
                    const buffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
                    fs.writeFileSync(filename, buffer);

                    files.push(filename);
                }
            }

            if (files.length > 0) {
                await loadingMsg.edit({
                    content: '',
                    files: files
                });

                // Clean up temporary files after 15 seconds
                setTimeout(() => {
                    files.forEach(filename => {
                        try {
                            fs.unlinkSync(filename);
                            console.log(`Temporary image file cleaned up: ${path.basename(filename)}`);
                        } catch (err) {
                            console.error('File cleanup error:', err.message);
                        }
                    });
                }, 15000);
            }
        }

    } catch (error) {
        console.error('Imagen API request failed:', error.response?.data || error.message);
        await loadingMsg.edit('❌ **Image Generation Failed**\nThe Imagen service is currently unavailable. Please try again in a few moments.');
    }
}

// VEO video generation command
async function handleVeo(message, args) {
    if (args.length === 0) {
        await message.reply('❌ **Invalid Command Usage**\nPlease provide a description for video generation.\n\n**Correct usage:** `!veo <your video description>`');
        return;
    }

    const prompt = args.join(' ');
    const sampleCount = 1;

    const loadingMsg = await message.reply('📺 **Veo 3.0 Processing**\nInitializing text-to-video generation.');

    try {
        // Veo 3 - Text to Video only
        console.log('Initiating Veo 3.0 text-to-video generation request');

        const requestData = {
            instances: [{
                prompt: prompt
            }],
            parameters: {
                aspectRatio: "16:9",
                sampleCount: sampleCount,
                personGeneration: "allow_all",
            }
        };

        const endpoint = `${PROXY_URL}/v1beta/models/veo-3.0-generate-preview:predictLongRunning`;

        const response = await axios.post(
            endpoint,
            requestData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': API_KEY
                },
                timeout: 320_000
            }
        );

        if (response.data && response.data.name) {
            const operationName = response.data.name;
            const operationId = operationName.split('/').pop();

            await loadingMsg.edit(`📺 **Video Generation In Progress**\nVeo 3.0 is processing your request.`);

            // Check operation status and download when video is ready
            await pollVideoStatus(loadingMsg, operationId, prompt, 'Veo 3.0');
        }

    } catch (error) {
        console.error('Veo API request failed:', error.response?.data || error.message);
        await loadingMsg.edit(`❌ **Video Generation Failed**\nThe Veo 3.0 service is currently unavailable. Please try again in a few moments.`);
    }
}

// Continuously check video status and upload directly to Discord when ready
async function pollVideoStatus(message, operationId, prompt, modelVersion = 'Veo') {
    let attempts = 0;
    const maxAttempts = 60; // Wait maximum 10 minutes (10 seconds * 60)

    while (attempts < maxAttempts) {
        try {
            const statusResponse = await axios.get(
                `${PROXY_URL}/v1beta/operations/${operationId}`,
                {
                    headers: {
                        'x-goog-api-key': API_KEY
                    }
                }
            );

            if (statusResponse.data.done === true) {
                console.log('Video generation operation completed successfully');

                // Check for errors first
                if (statusResponse.data.error) {
                    const error = statusResponse.data.error;
                    console.error('❌ Veo API returned error:', error.message);
                    await message.edit(`❌ **Video Generation Failed**\n\n**Error Details:**\n• ${error.message}\n\n💡 **Suggestion:** Please try rephrasing your prompt or use different keywords.`);
                    return;
                }

                // Check response
                const response = statusResponse.data.response?.generateVideoResponse;
                if (!response) {
                    console.error('❌ Invalid API response: generateVideoResponse object missing');
                    await message.edit('❌ **Service Error**\nReceived invalid response from video generation service. Please try again.');
                    return;
                }

                // Check RAI (safety) errors
                if (response.raiMediaFilteredCount > 0) {
                    const reasons = response.raiMediaFilteredReasons || ['Content filtered by safety systems'];
                    const reasonText = reasons.join('\n• ');
                    console.log('⚠️ Content filtered by safety systems:', reasons);
                    await message.edit(`❌ **Content Policy Violation**\n\n**Filtered Content:**\n• ${reasonText}\n\n💡 **Suggestion:** Please modify your prompt to comply with content guidelines and try again.`);
                    return;
                }

                // Get videos and upload directly to Discord
                const generatedSamples = response?.generatedSamples;
                console.log('📺 Processing generated video samples:', generatedSamples?.length || 0);

                if (generatedSamples && generatedSamples.length > 0) {
                    await message.edit('📺 **Video Generation Complete**\nPreparing video for upload to Discord');

                    const videoUris = generatedSamples.map(sample => sample?.video?.uri).filter(uri => uri);

                    if (videoUris.length > 0) {
                        console.log(`📺 Successfully retrieved ${videoUris.length} video URI(s) for download`);

                        try {
                            // Replace current message with first video
                            const videoUri = videoUris[0];
                            console.log('📥 Initiating video download from Veo service:', videoUri.substring(0, 50) + '...');

                            // tmp folder check and create
                            const tmpDir = path.join(process.cwd(), 'tmp');
                            if (!fs.existsSync(tmpDir)) {
                                fs.mkdirSync(tmpDir, { recursive: true });
                                console.log('📁 Created temporary directory for video processing');
                            }

                            const timestamp = Date.now();
                            const filename = path.join(tmpDir, `veo-video-${timestamp}.mp4`);

                            // Download video to file
                            const videoResponse = await axios.get(videoUri, {
                                responseType: 'stream',
                                timeout: 60000, // 60 second timeout
                                maxContentLength: 50 * 1024 * 1024, // 50MB limit
                                maxBodyLength: 50 * 1024 * 1024
                            });

                            const writer = fs.createWriteStream(filename);
                            videoResponse.data.pipe(writer);

                            await new Promise((resolve, reject) => {
                                writer.on('finish', () => {
                                    console.log('✅ Video successfully downloaded and saved:', path.basename(filename));
                                    resolve();
                                });
                                writer.on('error', (err) => {
                                    console.error('❌ Video download failed:', err.message);
                                    reject(err);
                                });
                            });

                            // Upload file to Discord
                            await message.edit({
                                content: '',
                                files: [filename]
                            });

                            console.log('✅ Video successfully uploaded to Discord channel');

                            // Clean up temporary file after 30 seconds
                            setTimeout(() => {
                                try {
                                    fs.unlinkSync(filename);
                                    console.log('🗑️ Temporary video file cleaned up:', path.basename(filename));
                                } catch (err) {
                                    console.error('⚠️ File cleanup error:', err.message);
                                }
                            }, 30000);

                            return;

                        } catch (uploadError) {
                            console.error('❌ Video upload to Discord failed:', uploadError.message);

                            // If upload fails, send URI link
                            try {
                                await message.edit({
                                    content: `📺 **Video Generation Complete**\n\n⬇️ **Direct Download Link:**\n${videoUris[0]}\n\n💡 **Note:** Video file was too large for Discord upload. Use the link above to download your video.`
                                });
                                console.log('📎 Video delivered via direct download link due to size constraints');
                                return;
                            } catch (linkError) {
                                console.error('❌ Failed to send download link:', linkError.message);
                                await message.edit(`❌ **Upload Failed**\nUnable to deliver video file. Please try generating a shorter video.\n\`\`\`${uploadError.message}\`\`\``);
                                return;
                            }
                        }
                    } else {
                        console.error('❌ No video URIs found in API response');
                        await message.edit('❌ **Service Error**\nVideo generation completed but download links are unavailable. Please try again.');
                        return;
                    }
                } else {
                    console.error('❌ No generated samples found in API response');
                    await message.edit('❌ **Service Error**\nVideo generation completed but no output samples were produced. Please try again.');
                    return;
                }
            }

            // Not ready yet, wait
            attempts++;

            // Dynamic timer: Show first 2 minutes, then count down
            let displayTime;
            if (attempts <= 12) { // First 12 attempts (2 minutes)
                displayTime = 120 - (attempts * 10); // Subtract 10 seconds every 10 seconds
            } else {
                // After 2 minutes show lower times
                const extraTime = Math.max(10, 120 - ((attempts - 12) * 15)); // Subtract 15 seconds each time
                displayTime = Math.min(120, extraTime);
            }

            const remainingMinutes = Math.floor(displayTime / 60);
            const remainingSeconds = displayTime % 60;

            let timeText = "";
            if (remainingMinutes > 0 && remainingSeconds > 0) {
                timeText = `${remainingMinutes} minutes ${remainingSeconds} seconds remaining`;
            } else if (remainingMinutes > 0) {
                timeText = `${remainingMinutes} minutes remaining`;
            } else if (remainingSeconds > 0) {
                timeText = `${remainingSeconds} seconds remaining`;
            } else {
                timeText = "Final checks in progress...";
            }

            await message.edit(`📺 **Video Generation In Progress**\nProcessing your request... ⏳ ${timeText}`);

            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

        } catch (error) {
            console.error('Video status polling error:', error.message);
            attempts++;

            if (attempts >= maxAttempts) {
                await message.edit(`❌ **Generation Timeout**\nVideo generation process exceeded maximum time limit (10 minutes).\n\`\`\`${error.message}\`\`\``);
                return;
            }

            await message.edit(`⚠️ **Temporary Service Issue** (Attempt ${attempts}/${maxAttempts})\nExperiencing connectivity issues. Retrying automatically...\n\`\`\`${error.message}\`\`\``);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }

    await message.edit('❌ **Generation Timeout**\nVideo generation process exceeded the maximum time limit of 10 minutes. Please try again with a simpler prompt.');
}


// Error handling
client.on('error', console.error);

// Start bot
if (!BOT_TOKEN) {
    console.error('❌ Configuration Error: Discord bot token not found in environment variables');
    console.log('💡 Solution: Add DISCORD_TOKEN=your_bot_token to the .env file');
    process.exit(1);
}

if (!API_KEY) {
    console.error('❌ Configuration Error: Google AI API key not found in environment variables');
    console.log('💡 Solution: Add API_KEY=your_api_key to the .env file');
    process.exit(1);
}

console.log(`🔗 Proxy Service URL: ${PROXY_URL}`);
console.log(`🔑 Google AI API Key: ${API_KEY ? '✅ Configured' : '❌ Missing'}`);
console.log(`🚀 Initializing Discord bot connection...`);

client.login(BOT_TOKEN);
