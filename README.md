# Discord AI Bot

A professional Discord bot that integrates with Google's advanced AI models for high-quality image and video generation.

## 🚀 Features

- **Image Generation**: Create stunning images using Google's Imagen 3.0 model
- **Video Generation**: Generate videos from text descriptions using Veo 3.0
- **Professional Interface**: Clean, informative messaging with detailed status updates
- **Error Handling**: Comprehensive error management with helpful user guidance
- **Channel Restriction**: Configurable to work only in specified Discord channels

## 🤖 Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `!imagen <description>` | Generate 4 high-quality images | `!imagen a sunset over mountains` |
| `!veo <description>` | Create a video from text description | `!veo a cat playing with a ball` |

## 📋 Prerequisites

- Node.js (version 16.0.0 or higher)
- Discord Bot Token
- Google AI API Key
- Discord Server with appropriate permissions

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/discord-ai-bot.git
   cd discord-ai-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .example.env .env
   ```
   
   Edit the `.env` file and add your credentials:
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   API_KEY=your_google_ai_api_key
   PROXY_URL=your_proxy_service_url
   ALLOWED_CHANNEL_ID=your_discord_channel_id
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

## 🔧 Configuration

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token to your `.env` file
5. Enable necessary intents:
   - Guilds
   - Guild Messages
   - Message Content

### Google AI API Setup

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Create an API key
3. Add the API key to your `.env` file

### Channel Configuration

1. Right-click on your Discord channel
2. Copy the Channel ID
3. Add it to `ALLOWED_CHANNEL_ID` in your `.env` file

## 📁 Project Structure

```
discord-ai-bot/
├── .env                 # Environment variables (not in repo)
├── .example.env         # Environment template
├── .gitignore          # Git ignore rules
├── index.js            # Main bot application
├── package.json        # Project dependencies
├── package-lock.json   # Dependency lock file
└── README.md           # Project documentation
```

## 🔒 Security Notes

- **Never commit your `.env` file** - it contains sensitive credentials
- The `.gitignore` file is configured to exclude sensitive files
- Keep your API keys and tokens secure
- Regularly rotate your credentials

## 🚀 Deployment

### Local Development
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Production
```bash
npm start    # Standard production start
```

## 📊 API Models Used

- **Imagen 3.0**: Google's latest image generation model
  - Generates 4 images per request
  - 1:1 aspect ratio
  - Enhanced prompt processing

- **Veo 3.0**: Google's advanced video generation model
  - Text-to-video generation
  - 16:9 aspect ratio
  - 2-5 minute processing time

## 🛡️ Error Handling

The bot includes comprehensive error handling for:
- API service unavailability
- Invalid user inputs
- Network connectivity issues
- File processing errors
- Content policy violations

## 📝 Logging

The bot provides detailed logging for:
- Service initialization
- Command processing
- API interactions
- File operations
- Error tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the console logs for detailed error messages
2. Verify your environment variables are correctly set
3. Ensure your API keys have proper permissions
4. Check Discord bot permissions in your server

## 🔄 Version History

- **v1.0.0** - Initial release with Imagen and Veo integration
- Professional messaging and error handling
- Simplified command structure

---

**Note**: This bot requires active API keys and proper Discord permissions to function correctly.