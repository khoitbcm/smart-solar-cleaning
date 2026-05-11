# Smart Solar Cleaning

Website gioi thieu san pham:

**HE THONG GIAM SAT VA TU DONG LAM SACH TAM QUANG DIEN UNG DUNG TRI TUE NHAN TAO DIEU KHIEN BANG PLC**

## Cau truc thu muc

```text
website/
|- index.html
|- styles.css
|- script.js
|- mo-hinh.jpg
|- so-do-he-thong.jpg
|- desktop.jpg
|- web.jpg
|- mobile.jpg
|- tai-lieu-du-an.md
`- assets/
```

## Cach day len GitHub

Nen tao repo rieng chi chua noi dung trong thu muc `website/`.

Vi du:

```bash
cd website
git init
git add .
git commit -m "Initial website"
git branch -M main
git remote add origin <URL_REPO_GITHUB>
git push -u origin main
```

## Cach bat GitHub Pages

1. Vao `Settings`
2. Chon `Pages`
3. O muc `Build and deployment`, chon:
   `Source`: `Deploy from a branch`
   `Branch`: `main`
   `Folder`: `/ (root)`
4. Luu lai

Sau khi GitHub build xong, website se chay tren URL GitHub Pages cua repo.

## Ghi chu

- Website la site tinh, khong can build.
- Tat ca anh va tai lieu da duoc dua vao cung thu muc de tranh loi link khi deploy.
- Cac file anh da duoc doi sang ten ASCII de on dinh hon tren GitHub Pages.
