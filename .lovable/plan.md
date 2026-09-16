# Supabase স্থিতিশীলতা ও Registration Fix

## লক্ষ্য
- সব page-এ বারবার দেখা Supabase environment/configuration error-এর মূল কারণ সরানো।
- registration-কে পুরোনো Edge Function-এর বদলে app-এর নির্ভরযোগ্য server flow-এ নেওয়া।
- update শেষে সব signed-in user-কে একবার professional “আপডেট সম্পন্ন” notice দেখানো।

## বাস্তবায়ন
1. **Supabase runtime binding ঠিক করা**
   - Connected Supabase থেকে URL, publishable key ও service-role key পুনরায় bind করা হয়েছে।
   - server-only privileged operations-এ একই canonical secret resolution ব্যবহার করা হবে; legacy alias compatibility রাখা হবে।
   - browser/auth middleware-এ public configuration resolution একীভূত থাকবে, যাতে preview ও custom domain উভয় জায়গায় কাজ করে।

2. **Registration flow বদলানো**
   - `/register` থেকে সরাসরি `register-user` Edge Function call সরিয়ে বিদ্যমান TanStack server function ব্যবহার করা হবে।
   - referral এবং distributor reference দুটোই server validator ও user metadata-তে সংরক্ষণ করা হবে।
   - account creation-এর পর sign-in flow অপরিবর্তিত থাকবে।
   - server/HTTP error থেকে আসল Bengali message বের করে generic “non-2xx” error আর user-কে দেখানো হবে না।

3. **Related environment failure paths শক্ত করা**
   - service-role presence check সব supported canonical/legacy alias চিনবে।
   - শুধু service-role প্রয়োজন এমন operation-এই privileged client ব্যবহার হবে; signed-in user data বর্তমান authenticated client দিয়েই চলবে।
   - Supabase connection failure user-facing হলে পরিষ্কার retry message দেখাবে, raw environment-variable text নয়।

4. **সব user-এর update-complete notice**
   - বিদ্যমান `notices` system-এ একটি published, all-users, informational notice যোগ করা হবে।
   - শিরোনাম: “সিস্টেম আপডেট সম্পন্ন”।
   - message-এ registration, server connection ও panel stability উন্নত হওয়ার কথা সংক্ষেপে জানানো হবে।
   - user panel-এ login-এর পর existing modal দিয়ে একবার দেখাবে; dismiss হলে আবার দেখাবে না।

5. **যাচাই**
   - registration server function-এর validation/error mapping পরীক্ষা করা হবে।
   - preview build/runtime logs-এ missing Supabase error নেই নিশ্চিত করা হবে।
   - নতুন test account দিয়ে registration → automatic login → dashboard flow এবং notice display browser-এ যাচাই করা হবে; test account পরে সরানো হবে।
