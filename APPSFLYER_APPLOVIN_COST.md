# AppLovin cost import in AppsFlyer

The app uses the same identifier on both platforms:

- Android package: `com.sasarei.almostclean`
- iOS bundle ID: `com.sasarei.almostclean`
- AppsFlyer iOS app ID (not the Cost-tab package field): `id6756276744`

## Required AppsFlyer settings

Open **Collaborate > Active integrations > Axon by AppLovin** for the relevant app.

1. In **Integration**, keep **Activate partner** enabled.
2. In **Attribution link**, ensure every click and impression URL contains
   `af_c_id={CAMPAIGN_ID}`. Do not use the campaign name or a static value in
   `af_c_id`.
3. In **Cost**, enable **Get cost data**.
4. Enter the AppLovin **Reporting API Key** from **AppLovin Ads Manager > Account >
   Keys**. The AppsFlyer dev key, AppLovin SDK key, and Campaign Management API key
   are different credentials and will not authenticate this import.
5. Enter `com.sasarei.almostclean` in the Android Package Name or iOS Bundle ID
   field, then select **Test integration** and **Save Cost**.

AppsFlyer normally starts showing API cost data within 5–6 hours after a valid
connection is saved. If its status says that the API is not returning matching
cost data, check that the connected AppLovin account has spend, the package matches,
and AppLovin's `{CAMPAIGN_ID}` reaches AppsFlyer as `af_c_id`.

## Safe local verification

The verifier reads the key only from the process environment and never prints the
key or the authenticated request URL.

```sh
read -s APPLOVIN_REPORTING_API_KEY
export APPLOVIN_REPORTING_API_KEY
npm run check:applovin-cost -- \
  --tracking-url 'https://app.appsflyer.com/com.sasarei.almostclean?pid=applovin_int&c={CAMPAIGN_NAME}&af_c_id={CAMPAIGN_ID}'
unset APPLOVIN_REPORTING_API_KEY
```

Pass each real click and impression tracking URL with a separate `--tracking-url`
argument. The check requests up to 45 days of advertiser data and verifies that:

- the Reporting API key is accepted;
- positive-cost rows use `com.sasarei.almostclean`;
- matching cost rows contain AppLovin `campaign_id_external` values;
- the tracking URLs send the same IDs with `af_c_id={CAMPAIGN_ID}`.

Do not commit the Reporting API key or paste it into source files.

Official references:

- https://support.applovin.com/en/growth/promoting-your-apps/track-and-optimize/appsflyer
- https://support.applovin.com/en/growth/promoting-your-apps/api/reporting-api
- https://support.appsflyer.com/hc/en-us/articles/360008850257-Set-up-ROI360-cost-API-to-measure-cost-data
