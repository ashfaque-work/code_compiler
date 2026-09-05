FROM golang:1-bookworm

# The Go toolchain refuses to build without a writable cache. Both paths land
# on the tmpfs mount, since the container root filesystem is read-only.
ENV GOCACHE=/tmp/gocache \
    GOPATH=/tmp/go

USER 65534:65534
WORKDIR /sandbox
