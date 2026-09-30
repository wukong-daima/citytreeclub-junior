export function TreeArt({
  stage = 4,
  decoration = "none",
  small = false,
  name = "내 친구",
}: {
  stage?: number;
  decoration?: string;
  small?: boolean;
  name?: string;
}) {
  return (
    <svg
      viewBox="0 0 500 440"
      fill="none"
      aria-label={`${stage}단계로 자라는 나무`}
      role="img"
    >
      <ellipse
        cx="250"
        cy="393"
        rx="155"
        ry="19"
        fill="#d4d8bb"
        opacity=".65"
      />
      <path d="M81 395Q241 369 416 396" stroke="#496640" strokeWidth="2" />
      {stage === 1 ? (
        <g>
          <path d="M218 388Q250 362 281 388" fill="#957857" />
          <ellipse cx="250" cy="377" rx="12" ry="8" fill="#baa070" />
          <path
            d="M250 373Q247 355 259 347"
            stroke="#6e914e"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      ) : stage === 2 ? (
        <g>
          <path
            d="M250 388V310"
            stroke="#6a8051"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M250 344Q202 345 208 304Q247 305 250 344M251 328Q292 329 291 289Q254 291 251 328"
            fill="#8ca365"
          />
        </g>
      ) : (
        <g
          style={{
            transformOrigin: "250px 390px",
            transform: `scale(${stage === 3 ? 0.68 : stage === 4 ? 0.87 : 1})`,
          }}
        >
          <path d="M231 388L237 194L251 153L264 188L271 386Z" fill="#756047" />
          <path
            d="M250 386L250 171M251 281L197 221M254 250L306 192M246 224L221 192"
            stroke="#4d4737"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M139 274C79 252 75 199 101 166C87 121 123 82 165 85C177 30 245 17 277 52C326 29 361 64 366 99C424 96 439 154 411 185C447 221 413 272 375 268C353 308 301 301 271 281C223 312 175 311 139 274Z"
            fill="#668547"
          />
          <path
            d="M137 171C100 125 141 84 181 98C181 56 239 36 265 72C304 42 351 74 349 110C399 95 421 148 396 173C414 196 400 228 374 233C347 202 319 214 299 233C270 212 240 218 218 247C169 252 158 211 137 171Z"
            fill="#8ca365"
          />
          <path
            d="M143 178C119 177 98 199 110 222C119 249 155 253 173 237M302 97C290 116 303 140 326 140M221 110C186 113 168 142 183 166"
            stroke="#b4c68a"
            strokeWidth="10"
            strokeLinecap="round"
            opacity=".55"
          />
          <path
            d="M172 284C215 279 239 261 249 238M276 273C314 277 340 261 349 244"
            stroke="#3e6941"
            strokeWidth="12"
            strokeLinecap="round"
            opacity=".45"
          />
          {Array.from({ length: small ? 16 : 70 }, (_, i) => (
            <circle
              key={i}
              cx={115 + ((i * 73) % 283)}
              cy={89 + ((i * 47) % 173)}
              r={(i % 3) + 1}
              fill={i % 2 ? "#385b35" : "#d4dca4"}
              opacity=".38"
            />
          ))}
          <path
            d="M245 358L244 292M260 353L259 312"
            stroke="#9b8664"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {decoration === "ribbon" && (
            <path
              d="M236 323L216 308V334L239 323L266 306V334L243 323"
              fill="#e6a16b"
            />
          )}
          {decoration === "nameplate" && (
            <g>
              <path d="M250 292V315" stroke="#f7edd5" />
              <rect
                x="211"
                y="310"
                width="79"
                height="30"
                rx="5"
                fill="#f5e8c9"
              />
              <text
                x="250"
                y="330"
                textAnchor="middle"
                fill="#4c6442"
                fontSize={Math.min(12, 70 / Math.max(name.length, 1))}
              >
                {name || "내 친구"}
              </text>
            </g>
          )}
          {decoration === "birdhouse" && (
            <g>
              <path d="M286 276L308 255L330 276" fill="#b96842" />
              <path d="M291 276H325V309H291Z" fill="#dbab75" />
              <circle cx="308" cy="288" r="7" fill="#57422d" />
            </g>
          )}
        </g>
      )}
      {stage < 3 && decoration !== "none" && (
        <g>
          <path d="M305 389V349" stroke="#a68a61" strokeWidth="5" />
          <rect x="276" y="331" width="65" height="31" rx="5" fill="#efdfbd" />
          <text
            x="308"
            y="352"
            textAnchor="middle"
            fill="#738258"
            fontSize="12"
          >
            {decoration === "nameplate"
              ? (name || "내 친구").slice(0, 5)
              : decoration === "ribbon"
                ? "🎀"
                : "🐦"}
          </text>
        </g>
      )}
      <path
        d="M133 389L128 375M134 389L143 379M356 390L361 375M356 390L348 381"
        stroke="#718550"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g fill="#f8f7f1">
        <circle cx="102" cy="350" r="4" />
        <circle cx="112" cy="354" r="4" />
      </g>
      <path
        d="M381 316q8-14 14-4q7-11 14-3"
        stroke="#6c7e52"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
