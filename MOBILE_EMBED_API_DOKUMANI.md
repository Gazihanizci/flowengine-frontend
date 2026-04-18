# Mobile Embed ve API Dokumani

Bu dokuman, mevcut web uygulamasini mobil uygulamaya gommek (WebView) ve/veya mobil istemciyi native API client ile yazmak icin teknik referanstir.

## 1. Sistem Ozeti

- Backend Base URL (ornek): `http://localhost:8080`
- Frontend endpointleri goreceli (`/api/...`) cagiriyor.
- Kimlik dogrulama JWT tabanli.
- Token local saklama anahtari: `auth_token`
- Uygulama ana modulleri:
  - Auth (login/register)
  - Flow yonetimi ve baslatma
  - Gorev formlari ve aksiyonlar
  - Bildirimler (okundu/onay/red)
  - Tarihce
  - PDF rapor
  - Rol yonetimi

## 1.1 Web Tasarim Temasi ve Renk Paleti

Mobil uygulamaya gomulu web ekranlarinda tutarli bir kurumsal tema kullanilmaktadir. Tema CSS tokenlari `src/App.css` icindeki `:root` altinda tanimlidir.

### Ana Tema Tokenlari

- `--bg`: `#eef3f9` (genel arka plan)
- `--panel`: `#ffffff` (kart/panel zemin)
- `--panel-soft`: `#f7faff` (ikincil yumuşak zemin)
- `--text`: `#12243a` (ana metin)
- `--muted`: `#52637a` (ikincil metin)
- `--line`: `#d5deea` (standart border)
- `--line-strong`: `#c4d0e0` (guclu border)
- `--primary`: `#1f5eff` (ana aksiyon)
- `--primary-strong`: `#1848c6` (hover/aktif derin ton)
- `--accent`: `#0b6dfa` (bilgilendirici vurgu)
- `--success`: `#0f8d4b` (basarili durum)
- `--warning`: `#b76a00` (uyari durum)
- `--danger`: `#b7392f` (hata/tehlike)

### Bilesen Bazli Renk Kurallari

- Sidebar:
  - `linear-gradient(180deg, #0f223f 0%, #102949 52%, #0f2a52 100%)`
- Primary buton:
  - `linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%)`
- Secondary buton:
  - `#eaf0ff` zemin, `#254b93` metin
- Input:
  - zemin `#f7faff`, focus ring `rgba(31,94,255,0.16)`
- Durum rozetleri:
  - Success: `var(--success)`
  - Warning: `var(--warning)`
  - Error: `var(--danger)`

### Mobilde Tema Uygulama Notlari

- WebView embedte tema degiskenleri CSS tarafinda oldugu icin ekstra mobil kod gerekmez.
- Native bileşenler de varsa ayni tokenlar mobil tema objesine aktarilmalidir:
  - iOS (SwiftUI/UIKit): `Color` map
  - Android (Compose/XML): `ColorScheme` map
- Kontrast hedefi:
  - Ana metin/zemin kontrasti en az WCAG AA seviyesinde tutulmalidir.

## 2. Kimlik Dogrulama

### 2.1 Login
- Method: `POST`
- Endpoint: `/api/auth/login`
- Request:
```json
{
  "email": "user@mail.com",
  "password": "secret"
}
```
- Response (beklenen):
```json
{
  "message": "string",
  "success": true,
  "token": "jwt"
}
```

### 2.2 Register
- Method: `POST`
- Endpoint: `/api/auth/register`
- Request:
```json
{
  "adSoyad": "Ad Soyad",
  "email": "user@mail.com",
  "password": "secret"
}
```
- Response: login ile ayni kontrat.

### 2.3 Me
- Method: `GET`
- Endpoint: `/api/kullanicilar/me`
- Header: `Authorization: Bearer <token>`
- Response: dizi donuyor, istemci ilk elemani kullaniyor.
```json
[
  {
    "kullaniciId": 13,
    "rolAdi": "Admin",
    "adSoyad": "Gazi Han",
    "rolId": 4
  }
]
```

## 3. Flow API'leri

### 3.1 Flow Listesi
- `GET /api/flows`
- Response:
```json
[
  {
    "akisId": 63,
    "akisAdi": "Satin Alma",
    "aciklama": "..."
  }
]
```

### 3.2 Flow Detayi
- `GET /api/flows/{flowId}`
- Response ozeti:
```json
{
  "flowId": 63,
  "flowName": "Satin Alma",
  "aciklama": "...",
  "baslatmaYetkileri": [
    { "tip": "USER", "refId": 12 }
  ],
  "steps": [
    {
      "stepId": 1,
      "stepName": "Adim 1",
      "externalFlowId": 70,
      "subFlowId": 70,
      "nextFlowId": 70,
      "fields": []
    }
  ]
}
```

### 3.3 Flow Baslatma
Istemci toleransli fallback yapiyor:
- Endpoint denemeleri:
  - `POST /api/flow/start`
  - `POST /api/flow/star`
- Body denemeleri:
  - `{ "akisId": 63 }`
  - `{ "flowId": 63 }`

Response beklenen:
```json
{
  "surecId": 1001,
  "mevcutAdimId": 1,
  "mesaj": "Akis baslatildi"
}
```

Not: Mobil istemci tek bir kontrat kullanacaksa backend tarafinda tek endpoint + tek body standardi sabitlenmeli.

### 3.4 Flow Map (Tree)
- `GET /api/flow-map/{akisId}`
- Child-flow gecislerini dolayli olarak `evre` alanindaki metinden (or. `2-CHILD (Subflow: 70)`) tespit etmek mumkun.

### 3.5 Flow Baslatma Yetkileri
- `GET /api/flow-yetki`
- Response:
```json
[
  {
    "id": 30,
    "akisId": 63,
    "tip": "USER",
    "refId": 12
  }
]
```

Kullanim:
- `akisId` ile filtreleyip flow bazli baslatma yetkisi cikarilir.
- `tip`:
  - `ROLE` => `refId` rol id
  - `USER` => `refId` kullanici id

## 4. Flow Tasarim Kaydetme

- `POST /api/designer/flows`
- Request:
```json
{
  "flowName": "Yeni Akis",
  "aciklama": "...",
  "baslatmaYetkileri": [
    { "tip": "ROLE", "refId": 2 },
    { "tip": "USER", "refId": 12 }
  ],
  "steps": [
    {
      "stepName": "Adim 1",
      "stepOrder": 1,
      "externalFlowEnabled": true,
      "externalFlowId": 70,
      "subFlowId": 70,
      "nextFlowId": 70,
      "waitForExternalFlowCompletion": true,
      "resumeParentAfterSubFlow": true,
      "fields": [
        {
          "type": "TEXT",
          "label": "Aciklama",
          "placeholder": "Yazin",
          "required": true,
          "orderNo": 1,
          "permissions": [
            { "tip": "ROLE", "refId": 2, "yetkiTipi": "EDIT" }
          ],
          "options": []
        }
      ]
    }
  ]
}
```

## 5. Gorev ve Form API'leri

### 5.1 Gorev Listesi
- `GET /api/my-tasks` (fallback: `/api/mytasks`)

### 5.2 Surec Detayi
- `GET /api/flow-detail/{surecId}` (fallback: `/api/workflow/{surecId}`)

### 5.3 Gorev Aksiyon Gonderimi
- Endpoint: `POST /api/tasks/{taskId}/action`

Istemci asamali deniyor:
1. JSON `{"aksiyonId","formData","userId"}`
2. JSON `{"aksiyonId","formData","kullaniciId"}`
3. JSON `{"aksiyonId","formData"}`
4. Multipart fallback (`aksiyonId`, `formData`, opsiyonel `userId`/`kullaniciId`)

Bu strateji, backend kontrat farkliliklari icin geriye uyumluluk amacli.

## 6. Workflow API (Alternatif Akis Ekrani)

- `GET /api/workflow/{surecId}`
- `POST /api/workflow/action`

Request:
```json
{
  "surecId": 1001,
  "aksiyonId": 1,
  "formData": {
    "1": "deger"
  }
}
```

Not: Bu client dosyasi su an otomatik `Authorization` interceptor kullanmiyor. Mobil istemcide mutlaka Bearer header eklenmeli.

## 7. Dosya API

### 7.1 Upload
- `POST /api/files/upload`
- Content-Type: `multipart/form-data`
- Form field: `file`
- Query params:
  - `surecId`
  - `adimId`
  - `aksiyonId`
  - `userId`

Response:
```json
{
  "dosyaId": 55,
  "dosyaAdi": "fatura.pdf",
  "downloadUrl": "/api/files/download/55"
}
```

## 8. Bildirim API

- `GET /api/bildirimler/me`
- `GET /api/bildirimler/me/okunmamis-sayi`
- `PUT /api/bildirim-islemleri/{bildirimId}/okundu`
- `POST /api/flow/requests/{requestId}/approve`
- `POST /api/flow/requests/{requestId}/reject`

`NotificationItem.tip`:
- `FLOW_TASK`
- `FLOW_REQUEST`
- `SUBFLOW_REQUEST`

## 9. Tarihce ve PDF

- `GET /api/history/my`
- `GET /api/surecler`
- `GET /api/pdf/generate/{surecId}` (blob/pdf)

## 10. Rol Yonetimi

- `GET /api/kullanici-rolleri`
- `GET /api/rol-atama/{kullaniciId}`
- `POST /api/rol-atama/assign?kullaniciId={id}&rolId={id}`
- `DELETE /api/rol-atama/remove?kullaniciId={id}&rolId={id}`
- `PUT /api/rol-atama/update?kullaniciId={id}&eskiRolId={id}&yeniRolId={id}`

## 11. Mobil Gomme Mimarisi (Oneri)

### 11.1 Secenek A: WebView Embed
- Mobil app login olduktan sonra JWT alir.
- JWT, WebView acilmadan once enjekte edilir:
  - Android: `evaluateJavascript("localStorage.setItem('auth_token', '...')")`
  - iOS: `WKUserScript`
- WebView acildiktan sonra app route'lari kullanilir.
- Logout oldugunda hem native secure storage hem web localStorage temizlenir.

### 11.2 Secenek B: Native API Client
- Tum endpointler native HTTP client ile cagrilir.
- UI tamamen native yazilir.
- Bu dokumandaki payload/response kontratlari birebir uygulanir.

### 11.3 Secenek C: Hybrid
- Kritik ekranlar native (gorev, bildirim), tasarim ekranlari WebView.

## 12. Token ve Guvenlik

- JWT secure storage'da tutulmali:
  - Android: EncryptedSharedPreferences/Keystore
  - iOS: Keychain
- WebView icin token enjekte edilirken sadece gerekli domain'de kullanin.
- App background'da token loglanmamali.
- Token suresi dolunca:
  - 401 yakala
  - login ekranina yonlendir
  - stale token temizle

## 13. Hata Yonetimi Standarti

API hata govdesi farkli formatlarda gelebiliyor:
- `string`
- `{ message }`
- `{ error }`
- `{ detail }`

Mobil tarafta normalize edin:
- Kullaniciya tek satir mesaj
- Teknik log'da HTTP status + endpoint + requestId

Onerilen hata metni:
- `HTTP {status}: {message|error|detail|string}`

## 14. Child Flow Mantigi (Is Kurali)

- Child flow baglantisi iki kaynaktan okunuyor:
  - Flow detail step alanlari (`externalFlowId/subFlowId/nextFlowId`)
  - Flow map `evre` metni (`Subflow:<id>`)
- Onizleme ekrani bu iki kaynagi birlestirip gecis cikariyor:
  - `From Step -> Child Flow -> To Step`

## 15. Mobil Icin Kritik Notlar

- Flow baslatma endpointi backendde tek standarda cekilmeli (`/api/flow/start` + `akisId` veya `flowId`).
- Task action endpointinde tek kontrat sabitlenmeli (JSON onerilir).
- `workflowApi` tarafina da Authorization standardi zorunlu olmali.
- API versiyonlama onerisi:
  - `/api/v1/...`

## 16. Test Senaryolari (Minimum)

1. Login -> me -> dashboard akisi.
2. Flow listesi -> flow baslat -> surecId donusu.
3. Gorev ac -> zorunlu alan validation -> gonder.
4. Dosya yukleme + aksiyon gonderimi.
5. Bildirim okundu + flow request approve/reject.
6. Child flow gecislerinin onizleme ve map ekraninda tutarli gorunmesi.
7. Token expiry (401) ve tekrar login.

## 17. Hizli Postman Koleksiyon Iskeleti

- Auth
  - `POST /api/auth/login`
  - `POST /api/auth/register`
- Flow
  - `GET /api/flows`
  - `GET /api/flows/{id}`
  - `POST /api/flow/start`
  - `GET /api/flow-map/{id}`
  - `GET /api/flow-yetki`
- Task
  - `GET /api/my-tasks`
  - `GET /api/flow-detail/{surecId}`
  - `POST /api/tasks/{taskId}/action`
- Notification
  - `GET /api/bildirimler/me`
  - `PUT /api/bildirim-islemleri/{id}/okundu`
  - `POST /api/flow/requests/{id}/approve`
  - `POST /api/flow/requests/{id}/reject`

---

Dokuman kaynaklari:
- `src/services/*.ts`
- `src/pages/FlowPreview.tsx`
- `src/pages/TaskDetailPage.tsx`
