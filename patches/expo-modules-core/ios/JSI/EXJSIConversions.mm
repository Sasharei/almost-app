// Copyright 2018-present 650 Industries. All rights reserved.

#import <react/bridging/CallbackWrapper.h>
#import <ExpoModulesCore/EXJavaScriptValue.h>
#import <ExpoModulesCore/EXJavaScriptObject.h>
#import <ExpoModulesCore/EXJavaScriptWeakObject.h>
#import <ExpoModulesCore/EXJSIConversions.h>
#import <ExpoModulesCore/EXJavaScriptValue.h>
#import <ExpoModulesCore/EXJavaScriptRuntime.h>
#import <ExpoModulesCore/EXJavaScriptSharedObjectBinding.h>
#import <ExpoModulesCore/EXStringUtils.h>
#import <Foundation/NSURL.h>
#import <ReactCommon/RCTTurboModule.h>

namespace expo {

/**
 * All static helper functions are ObjC++ specific.
 */
jsi::Value convertNSNumberToJSIBoolean(jsi::Runtime &runtime, NSNumber *value)
{
  return jsi::Value((bool)[value boolValue]);
}

jsi::Value convertNSNumberToJSINumber(jsi::Runtime &runtime, NSNumber *value)
{
  return jsi::Value([value doubleValue]);
}

jsi::String convertNSStringToJSIString(jsi::Runtime &runtime, NSString *value)
{
#if !TARGET_OS_OSX
  const uint8_t *utf8 = (const uint8_t *)[value UTF8String];
  const size_t length = [value length];

  if (utf8 != nullptr && expo::isAllASCIIAndNotNull(utf8, utf8 + length)) {
    return jsi::String::createFromAscii(runtime, (const char *)utf8, length);
  }
  // Using cStringUsingEncoding should be fine as long as we provide the length.
  return jsi::String::createFromUtf8(runtime, [value UTF8String]);
#else
  // TODO(@jakex7): Remove after update to react-native-macos@0.79.0
  return jsi::String::createFromUtf8(runtime, [value UTF8String]);
#endif
}

jsi::String convertNSURLToJSIString(jsi::Runtime &runtime, NSURL *value)
{
  NSString *stringValue = [value absoluteString];
  return convertNSStringToJSIString(runtime, stringValue);
}

jsi::Object convertNSDictionaryToJSIObject(jsi::Runtime &runtime, NSDictionary *value)
{
  jsi::Object result = jsi::Object(runtime);
  for (NSString *k in value) {
    result.setProperty(runtime, [k UTF8String], convertObjCObjectToJSIValue(runtime, value[k]));
  }
  return result;
}

jsi::Array convertNSArrayToJSIArray(jsi::Runtime &runtime, NSArray *value)
{
  jsi::Array result = jsi::Array(runtime, value.count);
  for (size_t i = 0; i < value.count; i++) {
    result.setValueAtIndex(runtime, i, convertObjCObjectToJSIValue(runtime, value[i]));
  }
  return result;
}

std::vector<jsi::Value> convertNSArrayToStdVector(jsi::Runtime &runtime, NSArray *value)
{
  std::vector<jsi::Value> result;
  for (size_t i = 0; i < value.count; i++) {
    result.emplace_back(convertObjCObjectToJSIValue(runtime, value[i]));
  }
  return result;
}

jsi::Value createUint8Array(jsi::Runtime &runtime, NSData *data) {
  auto global = runtime.global();
  auto arrayBufferCtor = global.getPropertyAsFunction(runtime, "ArrayBuffer");
  auto arrayBufferObject = arrayBufferCtor.callAsConstructor(runtime, static_cast<int>(data.length)).getObject(runtime);
  auto arrayBuffer = arrayBufferObject.getArrayBuffer(runtime);
  memcpy(arrayBuffer.data(runtime), data.bytes, data.length);

  auto uint8ArrayCtor = global.getPropertyAsFunction(runtime, "Uint8Array");
  auto uint8Array = uint8ArrayCtor.callAsConstructor(runtime, arrayBufferObject).getObject(runtime);
  return uint8Array;
}

jsi::Value convertObjCObjectToJSIValue(jsi::Runtime &runtime, id value)
{
  if ([value isKindOfClass:[EXJavaScriptValue class]]) {
    return [(EXJavaScriptValue *)value get];
  }
  if ([value isKindOfClass:[EXJavaScriptObject class]]) {
    return jsi::Value(runtime, *[(EXJavaScriptObject *)value get]);
  }
  if ([value isKindOfClass:[EXJavaScriptWeakObject class]]) {
    return jsi::Value(runtime, *[[(EXJavaScriptWeakObject *)value lock] get]);
  }
  if ([value isKindOfClass:[EXJavaScriptSharedObjectBinding class]]) {
    return jsi::Value(runtime, *[[(EXJavaScriptSharedObjectBinding *)value get] get]);
  }
  if ([value isKindOfClass:[NSString class]]) {
    return convertNSStringToJSIString(runtime, (NSString *)value);
  } else if ([value isKindOfClass:[NSNumber class]]) {
    if ([value isKindOfClass:[@YES class]]) {
      return convertNSNumberToJSIBoolean(runtime, (NSNumber *)value);
    }
    return convertNSNumberToJSINumber(runtime, (NSNumber *)value);
  } else if ([value isKindOfClass:[NSDictionary class]]) {
    return convertNSDictionaryToJSIObject(runtime, (NSDictionary *)value);
  } else if ([value isKindOfClass:[NSArray class]]) {
    return convertNSArrayToJSIArray(runtime, (NSArray *)value);
  } else if ([value isKindOfClass:[NSData class]]) {
    return createUint8Array(runtime, (NSData *)value);
  } else if ([value isKindOfClass:[NSURL class]]) {
    return convertNSURLToJSIString(runtime, (NSURL *)value);
  } else if (value == (id)kCFNull) {
    return jsi::Value::null();
  } else if (value == nil) {
    return jsi::Value::undefined();
  } else if ([NSStringFromClass([value class]) isEqualToString:@"__SwiftValue"]) {
    // Swift sometimes wraps `Void`/`Optional.none` values into a private
    // __SwiftValue container when crossing the Objective-C boundary.
    // Treat those as `undefined` on the JS side so we don't crash while
    // serializing unexpected values.
    return jsi::Value::undefined();
  }
  NSString *reason = [NSString stringWithFormat:@"convertObjCObjectToJSIValue: Unsupported value %@ of type %@.", value, [value class]];
  throw std::runtime_error([reason UTF8String]);
}

jsi::Value convertObjCNSNumberToBoolean(jsi::Runtime &runtime, NSNumber *value)
{
  return convertNSNumberToJSIBoolean(runtime, value);
}

jsi::Value convertObjCNSNumberToNumber(jsi::Runtime &runtime, NSNumber *value)
{
  return convertNSNumberToJSINumber(runtime, value);
}

NSString *convertJSIStringToNSString(jsi::Runtime &runtime, const jsi::String &value)
{
  auto utf8 = value.utf8(runtime);
  return [NSString stringWithUTF8String:utf8.c_str()];
}

NSArray *convertJSIArrayToNSArray(jsi::Runtime &runtime, const jsi::Array &value, std::shared_ptr<CallInvoker> jsInvoker)
{
  size_t size = value.size(runtime);
  NSMutableArray *result = [NSMutableArray arrayWithCapacity:size];
  for (size_t i = 0; i < size; i++) {
    id converted = convertJSIValueToObjCObject(runtime, value.getValueAtIndex(runtime, i), jsInvoker);
    [result addObject:converted ?: (id)kCFNull];
  }
  return result;
}

NSArray<EXJavaScriptValue *> *convertJSIValuesToNSArray(EXJavaScriptRuntime *runtime, const jsi::Value *values, size_t count)
{
  NSMutableArray<EXJavaScriptValue *> *result = [NSMutableArray arrayWithCapacity:count];
  jsi::Runtime *jsRuntime = [runtime get];
  for (size_t i = 0; i < count; i++) {
    jsi::Value copy(*jsRuntime, *(values + i));
    [result addObject:[[EXJavaScriptValue alloc] initWithRuntime:runtime value:std::move(copy)]];
  }
  return result;
}

NSDictionary *convertJSIObjectToNSDictionary(jsi::Runtime &runtime, const jsi::Object &value, std::shared_ptr<CallInvoker> jsInvoker)
{
  jsi::Array propertyNames = value.getPropertyNames(runtime);
  size_t size = propertyNames.size(runtime);
  NSMutableDictionary *result = [NSMutableDictionary dictionaryWithCapacity:size];
  for (size_t i = 0; i < size; i++) {
    jsi::String propertyName = propertyNames.getValueAtIndex(runtime, i).getString(runtime);
    NSString *key = convertJSIStringToNSString(runtime, propertyName);
    id converted = convertJSIValueToObjCObject(runtime, value.getProperty(runtime, propertyName), jsInvoker);
    if (converted) {
      result[key] = converted;
    }
  }
  return result;
}

id convertJSIValueToObjCObject(jsi::Runtime &runtime, const jsi::Value &value, std::shared_ptr<CallInvoker> jsInvoker)
{
  return TurboModuleConvertUtils::convertJSIValueToObjCObject(runtime, value, jsInvoker);
}

RCTResponseSenderBlock convertJSIFunctionToCallback(jsi::Runtime &runtime, const jsi::Function &value, std::shared_ptr<CallInvoker> jsInvoker)
{
  jsi::Value functionValue(runtime, value);
  id block = convertJSIValueToObjCObject(runtime, functionValue, jsInvoker);
  return (RCTResponseSenderBlock)block;
}

} // namespace expo
