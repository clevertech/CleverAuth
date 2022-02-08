module.exports = {
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  "testEnvironment": "node",
  "testRegex": "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node"
  ],
  "coveragePathIgnorePatterns": [
    "/node_modules/",
    "/test/"
  ],
  "mapCoverage": true,
  "collectCoverage": true,
  "coverageThreshold": {
    "global": {
      "branches": 60,
      "functions": 60,
      "lines": 70,
      "statements": 65
    }
  },
  "globals": {
    "Uint8Array": Uint8Array,
    "ArrayBuffer": ArrayBuffer
  },
};
