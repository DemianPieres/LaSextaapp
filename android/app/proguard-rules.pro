# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Capacitor
-keep class com.capacitorjs.** { *; }
-keep class com.getcapacitor.** { *; }
-dontwarn com.capacitorjs.**
-dontwarn com.getcapacitor.**

# Gson (required for barcode scanner plugin)
-keep class com.google.gson.** { *; }
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn com.google.gson.**

# Barcode Scanner Plugin
-keep class com.outsystems.plugins.barcode.** { *; }
-dontwarn com.outsystems.plugins.barcode.**

# Ionic
-keep class io.ionic.** { *; }
-dontwarn io.ionic.**

# WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve line numbers for debugging
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# React Native / JavaScript bridge
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Parcelables
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep serialization
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
