#!/bin/bash

function error {
  echo
  echo -e "\e[31m\e[1m            ERROR OCCURED!\e[0m"
  echo "See the trace above for more information."
}

function prompt {
  read -p "$1" -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]
  then
    return 0
  fi
  return 1
}

set -eE
trap "set +x; error" ERR

VERSION=$(yarn run _version | sed -n -e 's/^VERSION: //p')
prompt "Detected version v$VERSION. Is this ok (y/n)? "

if [[ $(git branch | grep \* | cut -d ' ' -f2) != dev* ]];
then
  echo -e "\e[31m\e[1mYou are not on a dev branch!\e[0m"
  false
fi

if ! yarn audit;
then
  echo -e "\e[31m\e[1mYarn audit shows issues. Fix them before releasing!\e[0m"
  prompt "Continue anyway (y/n)? "
  echo
fi

echo Merging master into dev to overwrite master...
git merge --no-edit -s ours master
echo Moving to master branch...
git checkout master
echo Merging dev...
git merge dev

echo Building...
yarn run build
echo Adding `dist`...
git add -rf dist/ dist/*
echo Committing...
git commit -m "Build v$VERSION"

echo Building docs...
yarn run build:docs
echo Moving to gh-pages branch...
git checkout gh-pages
echo Removing old data...
git rm -r assets/ classes/ enums/ interfaces/ modules/ globals.html index.html
echo Copying TypeDoc...
cp -r .jsdoc/* .
echo Adding TypeDoc...
git add -r *
echo Committing...
git commit -m "Build v$VERSION"

echo
echo -e "Completed. \e[1mRemember to run git push!"
