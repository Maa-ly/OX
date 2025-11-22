# Testing Walrus SDK File Upload

## Test Scenarios

### 1. Test Text Upload
- Navigate to `/discover` page
- Connect your wallet
- Create a post with text content
- Verify it uploads successfully

### 2. Test Image Upload
- Navigate to `/discover` page
- Connect your wallet
- Click "Create Post"
- Select "Image" media type
- Upload an image file (JPEG, PNG, etc.)
- Add text content
- Submit post
- Verify image is stored and displayed

### 3. Test Video Upload
- Navigate to `/discover` page
- Connect your wallet
- Click "Create Post"
- Select "Video" media type
- Upload a video file (MP4, WebM, etc.)
- Add text content
- Submit post
- Verify video is stored and displayed

### 4. Test Contribution Upload
- Navigate to `/contribute` page
- Connect your wallet
- Select an IP token
- Submit a contribution (rating, prediction, review, or stake)
- Verify contribution is stored successfully

## Expected Behavior

1. **Wallet Connection Required**: All uploads require wallet connection
2. **WAL Token Balance**: User needs WAL tokens to pay for storage
3. **Transaction Popups**: Two wallet popups per upload:
   - First: Register blob transaction
   - Second: Certify blob transaction
4. **Auto-detection**: File type and content-type are auto-detected from File objects
5. **Error Handling**: Clear error messages for:
   - Insufficient WAL balance
   - Wallet not connected
   - User rejected transaction

## Console Logs to Watch

- `[storeBlobWithUserWallet]` - Single file upload
- `[storeMediaFileWithUserWallet]` - Media file upload
- `[storePost]` - Post creation with media
- `[storeContributionWithUserWallet]` - Contribution upload
- `[signAndExecuteTransaction]` - Transaction signing

## Testing Checklist

- [ ] Text post uploads successfully
- [ ] Image post uploads successfully
- [ ] Video post uploads successfully
- [ ] Contribution uploads successfully
- [ ] Error handling works (insufficient WAL balance)
- [ ] Error handling works (wallet not connected)
- [ ] File type auto-detection works
- [ ] Content-type tags are set correctly
- [ ] Multiple files can be uploaded together

