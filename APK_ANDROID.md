# Generar la APK de Concaribe Tracker (para probar en tu móvil)

La APK es un **envoltorio nativo** que carga el sitio real (el mismo de Vercel), pero
con acceso a **ubicación en segundo plano** (sigue reportando aunque bloquees la
pantalla o mandes la app a segundo plano, mientras el vendedor tenga jornada abierta).

El sitio web sigue funcionando por su cuenta, sin cambios. Esto es adicional.

---

## Requisitos (una sola vez)

1. **Android Studio** — descárgalo de https://developer.android.com/studio e instálalo
   (incluye el SDK de Android y todo lo necesario). Ábrelo una vez para que termine de
   bajar los componentes que pida.
2. **Java JDK 17** — Android Studio suele traerlo. Si `java -version` no funciona,
   instala Temurin 17 (https://adoptium.net).

---

## Pasos para crear la APK

Abre una terminal en la carpeta del proyecto y corre:

```bash
npm install
npm run app:android:add     # crea la carpeta android/ (solo la primera vez)
npm run app:android:sync    # copia la config de Capacitor al proyecto Android
npm run app:android:open    # abre el proyecto en Android Studio
```

Ya en **Android Studio**:

1. Espera a que termine de indexar/sincronizar Gradle (barra de progreso abajo).
2. Menú **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. Cuando termine, aparece un aviso "APK(s) generated" con un enlace **locate** — dale
   clic y te lleva al archivo. Estará en:
   `android/app/build/outputs/apk/debug/app-debug.apk`
4. Pasa ese `app-debug.apk` a tu teléfono (por cable, WhatsApp, Drive, etc.) e instálalo
   (tendrás que permitir "instalar apps de origen desconocido").

---

## Permiso de ubicación en segundo plano (importante)

La primera vez que un vendedor inicie una ruta en la app, Android le pedirá permiso de
ubicación. Para que funcione en segundo plano hay que concederlo como **"Permitir todo
el tiempo"** (no solo "mientras se usa la app"). En Ajustes → Apps → Concaribe Tracker →
Permisos → Ubicación → **Permitir siempre**.

El plugin muestra una **notificación permanente** mientras rastrea ("Compartiendo tu
ubicación durante la jornada") — es un requisito de Android para no matar el proceso, y
también le avisa al vendedor que se está compartiendo su ubicación.

---

## Notas honestas

- El seguimiento en segundo plano funciona con la app **abierta o minimizada / pantalla
  bloqueada**. Si el vendedor **cierra la app por completo** (la desliza para cerrarla),
  Android puede detener el servicio; al reabrirla se reanuda.
- Esta es una **APK de depuración (debug)** para pruebas — no está firmada para
  publicación en Play Store (que era justo lo que querías: probar sin publicar).
- Si cambias el sitio en Vercel, la APK carga la versión nueva automáticamente (porque
  apunta a la URL de Vercel). No hace falta recompilar la APK por cambios del sitio;
  solo la recompilas si cambias algo nativo (plugins, permisos).
