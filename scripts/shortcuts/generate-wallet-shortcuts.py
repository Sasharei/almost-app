"""Build Almost-owned Wallet workflows. Sign outputs with Apple's shortcuts sign CLI.
No transaction data or third-party workflow actions are included.
"""
import argparse, pathlib, plistlib, subprocess, tempfile
from verify_wallet_shortcuts import verify
ROOT = pathlib.Path(__file__).resolve().parents[2]
def variable(property_names, trigger):
    value = {'Type': 'TriggerOutput', 'TriggerIdentifier': 'WFWalletTransactionTrigger'} if trigger else {'Type': 'ExtensionInput'}
    value['Aggrandizements'] = [{'Type': 'WFPropertyVariableAggrandizement', 'PropertyName': name} for name in property_names]
    # Explicit currency-amount properties avoid the editor's fixed device currency.
    return {'WFSerializationType': 'WFTextTokenString', 'Value': {'string': '\ufffc', 'attachmentsByRange': {'{0, 1}': value}}}
def workflow(trigger):
    result = {
        'WFWorkflowName': 'Almost Apple Pay',
        'WFWorkflowMinimumClientVersion': 900,
        'WFWorkflowMinimumClientVersionString': '900',
        'WFWorkflowClientVersion': '5037.109',
        'WFWorkflowIcon': {'WFWorkflowIconStartColor': 946986751, 'WFWorkflowIconGlyphNumber': 61440},
        'WFWorkflowHasShortcutInputVariables': True,
        'WFWorkflowImportQuestions': [], 'WFWorkflowTypes': ['WFWorkflowTypeShowInSearch'],
        'WFQuickActionSurfaces': [], 'WFWorkflowInputContentItemClasses': ['WFGenericFileContentItem'],
        'WFWorkflowOutputContentItemClasses': [], 'WFWorkflowHasOutputFallback': False,
        'WFWorkflowActions': [{
            'WFWorkflowActionIdentifier': 'com.sasarei.almostclean.ImportApplePayTransactionIntent',
            'WFWorkflowActionParameters': {
                'UUID': 'B089CAFE-947E-4ABC-90EF-38EB02C2191D',
                'AppIntentDescriptor': {'TeamIdentifier': 'CGRYGJXPS2', 'BundleIdentifier': 'com.sasarei.almostclean',
                                        'Name': 'Almost', 'AppIntentIdentifier': 'ImportApplePayTransactionIntent'},
                'amount': variable(['Amount', 'Currency Amount'], trigger),
                'currency': variable(['Amount', 'Currency Code'], trigger),
                'merchant': variable(['Merchant'], trigger)
            }
        }]
    }
    if trigger:
        # Empty filters mean any card, category and merchant. Imported automations need user enablement.
        result['WFWorkflowTriggers'] = [{'WFTriggerIdentifier': 'WFWalletTransactionTrigger',
            'WFTriggerUUID': 'FE0E6594-322F-4631-9EBC-20F6D9F47F2D', 'WFTriggerSerializedParameters': {}}]
    return result
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--automation-export', type=pathlib.Path,
                        help='File → Anyone export from iOS 27 Shortcuts; verified before bundling')
    args = parser.parse_args()
    for name, trigger in [('AlmostApplePayAction', False), ('AlmostApplePayAutomation', True)]:
        source = ROOT / 'scripts/shortcuts' / (name + '.unsigned.shortcut')
        source.write_bytes(plistlib.dumps(workflow(trigger), fmt=plistlib.FMT_BINARY, sort_keys=True))
        destination = ROOT / 'ios/Almost' / (name + '.shortcut')
        if trigger and args.automation_export:
            verify(workflow(True), args.automation_export)
            destination.write_bytes(args.automation_export.read_bytes())
        elif trigger and destination.exists():
            # macOS 26 strips iOS 27 triggers: preserve only a validated device export.
            verify(workflow(True), destination)
        else:
            with tempfile.TemporaryDirectory(prefix='almost-wallet-sign-') as directory:
                candidate = pathlib.Path(directory) / (name + '.shortcut')
                subprocess.run(['shortcuts', 'sign', '--mode', 'anyone', '--input', str(source), '--output', str(candidate)], check=True)
                verify(workflow(trigger), candidate)
                destination.write_bytes(candidate.read_bytes())
