export const metadata = {
  title: "종이길 — 폐지가 나온 곳을, 필요한 분께",
  description:
    "가게 앞에 배출된 폐지 정보를 AI로 분석해 폐지 수집 어르신께 전달하는 서비스",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          fontFamily:
            "'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif",
          background: "#8F6B3D",
          color: "#26221B",
        }}
      >
        {children}
      </body>
    </html>
  );
}
